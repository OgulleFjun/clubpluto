import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { env } from '../config.js';
import { getSettings } from '../competition.js';
import { authenticate, loadAccount, publicAccount, signToken } from '../auth.js';
import { asyncRoute, httpError } from '../http.js';
import { doorCode, randomToken } from '../tokens.js';
import { removeFile, saveImage, upload } from '../uploads.js';

const router = Router();

router.post(
  '/login',
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await query('SELECT * FROM accounts WHERE email = $1', [email]);
    const account = rows[0];
    if (!account || !account.active) throw httpError(401, 'Fel e-post eller lösenord.');
    const ok = await bcrypt.compare(password, account.password_hash);
    if (!ok) throw httpError(401, 'Fel e-post eller lösenord.');
    const participant = await query('SELECT * FROM participants WHERE account_id = $1', [account.id]);
    res.json({
      token: signToken(account),
      user: publicAccount(account, participant.rows[0]),
    });
  })
);

router.get(
  '/me',
  authenticate,
  loadAccount,
  asyncRoute(async (req, res) => {
    res.json({ user: publicAccount(req.account, req.participant) });
  })
);

router.post(
  '/staff-intro',
  authenticate,
  loadAccount,
  asyncRoute(async (req, res) => {
    if (req.account.role !== 'gamemaster') throw httpError(403, 'Den här delen är stängd för ditt konto.');
    await query('UPDATE accounts SET staff_intro_seen = true WHERE id = $1', [req.account.id]);
    res.json({ ok: true });
  })
);

function sameSecret(input, expected) {
  const left = Buffer.from(String(input));
  const right = Buffer.from(String(expected));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function cleanName(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 80) throw httpError(400, 'Namnet behöver 1–80 tecken.');
  return text;
}

router.post(
  '/gate',
  asyncRoute(async (req, res) => {
    const door = req.body.door === 'staff' ? 'staff' : 'player';
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const gate = door === 'staff' ? env.staffGatePassword : env.playerGatePassword;
    if (!email.includes('@')) throw httpError(401, 'Det stämmer inte.');

    const { rows } = await query('SELECT * FROM accounts WHERE email = $1', [email]);
    const account = rows[0];
    if (!account) {
      if (!sameSecret(password, gate)) throw httpError(401, 'Det stämmer inte.');
      const settings = await getSettings();
      if (!settings.registration_open) throw httpError(403, 'Stängt.');
      return res.json({ needsProfile: true });
    }
    if (!account.active) throw httpError(401, 'Det stämmer inte.');

    if (door === 'player') {
      if (account.role !== 'participant') throw httpError(401, 'Det stämmer inte.');
      const ok = sameSecret(password, env.playerGatePassword) || await bcrypt.compare(password, account.password_hash);
      if (!ok) throw httpError(401, 'Det stämmer inte.');
    } else {
      if (!['admin', 'doorman', 'gamemaster'].includes(account.role)) throw httpError(401, 'Det stämmer inte.');
      let personal = false;
      try {
        personal = await bcrypt.compare(password, account.password_hash);
      } catch {
        personal = false;
      }
      const shared = (account.role === 'admin' || account.role === 'gamemaster') && sameSecret(password, env.staffGatePassword);
      if (!personal && !shared) throw httpError(401, 'Det stämmer inte.');
      if (account.role === 'admin' && shared && !personal) {
        const passwordHash = await bcrypt.hash(env.staffGatePassword, 10);
        await query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [passwordHash, account.id]);
      }
    }

    const participant = await query('SELECT * FROM participants WHERE account_id = $1', [account.id]);
    res.json({
      token: signToken(account),
      user: publicAccount(account, participant.rows[0]),
    });
  })
);

router.post(
  '/gate-register',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    const door = req.body.door === 'staff' ? 'staff' : 'player';
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const gate = door === 'staff' ? env.staffGatePassword : env.playerGatePassword;
    const name = cleanName(req.body.name);
    const alias = String(req.body.alias || '').trim();
    if (alias.length > 40) throw httpError(400, 'Aliaset får vara högst 40 tecken.');
    if (!email.includes('@') || !sameSecret(password, gate)) throw httpError(401, 'Det stämmer inte.');

    const settings = await getSettings();
    if (!settings.registration_open) throw httpError(403, 'Stängt.');
    if (door === 'player' && !alias) throw httpError(400, 'Ange ett alias.');
    if (door === 'player' && !req.file) throw httpError(400, 'Ladda upp ett äkta porträtt, utan mask eller förklädnad.');

    const photoToken = randomToken();
    let photoPath = '';
    try {
      if (req.file) photoPath = await saveImage(req.file, env.portraitDir, `${photoToken}.jpg`);
      const created = await withTransaction(async (client) => {
        const existing = await client.query('SELECT id FROM accounts WHERE email = $1', [email]);
        if (existing.rows[0]) throw httpError(400, 'Den e-postadressen finns redan.');
        const passwordHash = await bcrypt.hash(gate, 10);
        if (door === 'staff') {
          const account = await client.query(
            `INSERT INTO accounts (email, password_hash, role, display_name)
             VALUES ($1, $2, 'gamemaster', $3) RETURNING *`,
            [email, passwordHash, name]
          );
          return { account: account.rows[0], participant: null };
        }
        const account = await client.query(
          `INSERT INTO accounts (email, password_hash, role, display_name)
           VALUES ($1, $2, 'participant', $3) RETURNING *`,
          [email, passwordHash, name]
        );
        const participant = await client.query(
          `INSERT INTO participants (
            account_id, name, alias, email, photo_path, photo_token, name_token, door_code,
            membership, can_invite
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'guest', false) RETURNING *`,
          [
            account.rows[0].id,
            name,
            alias,
            email,
            photoPath,
            photoToken,
            randomToken(),
            doorCode(),
          ]
        );
        return { account: account.rows[0], participant: participant.rows[0] };
      });
      res.status(201).json({
        token: signToken(created.account),
        user: publicAccount(created.account, created.participant),
      });
    } catch (error) {
      removeFile(photoPath);
      throw error;
    }
  })
);

router.post(
  '/change-password',
  authenticate,
  loadAccount,
  asyncRoute(async (req, res) => {
    const current = String(req.body.currentPassword || '');
    const next = String(req.body.newPassword || '');
    if (next.length < 8) throw httpError(400, 'Nya lösenordet behöver minst 8 tecken.');
    const { rows } = await query('SELECT password_hash FROM accounts WHERE id = $1', [req.account.id]);
    const ok = await bcrypt.compare(current, rows[0].password_hash);
    if (!ok) throw httpError(400, 'Nuvarande lösenord stämmer inte.');
    const hash = await bcrypt.hash(next, 10);
    await query('UPDATE accounts SET password_hash = $2 WHERE id = $1', [req.account.id, hash]);
    res.json({ ok: true });
  })
);

export default router;
