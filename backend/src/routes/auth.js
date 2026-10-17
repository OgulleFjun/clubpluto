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
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    if (!['admin', 'doorman', 'gamemaster'].includes(req.account.role)) {
      throw httpError(403, 'Den här delen är stängd för ditt konto.');
    }
    const name = cleanName(req.body.name);
    const alias = String(req.body.alias || '').trim();
    const age = Number(req.body.age);
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!alias || alias.length > 40) throw httpError(400, 'Ange ett alias.');
    if (!Number.isInteger(age) || age < 1 || age > 120) throw httpError(400, 'Ange en ålder.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPlaceholderEmail(email)) {
      throw httpError(400, 'Ange en e-postadress.');
    }
    let updated;
    try {
      updated = await query(
        `UPDATE accounts
         SET display_name = $1, alias = $2, age = $3, email = $4, staff_intro_seen = true
         WHERE id = $5
         RETURNING *`,
        [name, alias, age, email, req.account.id]
      );
    } catch (error) {
      if (error.code === '23505') throw httpError(400, 'Den e-postadressen finns redan.');
      throw error;
    }
    const account = updated.rows[0];
    let participant = await ensureStaffParticipant(account, req.participant);
    if (req.file) {
      const dest = await saveImage(req.file, env.portraitDir, `${participant.photo_token}.jpg`);
      const saved = await query('UPDATE participants SET photo_path = $2 WHERE id = $1 RETURNING *', [participant.id, dest]);
      participant = saved.rows[0];
    }
    res.json({ user: publicAccount(account, participant) });
  })
);

const NAME_MAIL = '@namn.clubpluto.eu';

function personName(body) {
  const first = String(body.firstName || '').trim().replace(/\s+/g, ' ');
  const last = String(body.lastName || '').trim().replace(/\s+/g, ' ');
  if (!first || !last) throw httpError(400, 'Skriv förnamn och efternamn.');
  const name = `${first} ${last}`;
  if (name.length > 80) throw httpError(400, 'Namnet behöver 1–80 tecken.');
  return name;
}

function placeholderEmail(name, door) {
  const hash = crypto.createHash('sha256').update(`${door}\n${name.toLowerCase()}`).digest('hex').slice(0, 16);
  return `${hash}${NAME_MAIL}`;
}

function isPlaceholderEmail(email) {
  return String(email || '').toLowerCase().endsWith(NAME_MAIL);
}

async function findByName(name, door) {
  const roles = door === 'staff' ? ['admin', 'doorman', 'gamemaster'] : ['participant'];
  const { rows } = await query(
    `SELECT * FROM accounts
     WHERE lower(regexp_replace(trim(display_name), '[[:space:]]+', ' ', 'g')) = lower($1)
       AND role = ANY($2::text[])
       AND active
     ORDER BY created_at
     LIMIT 1`,
    [name, roles]
  );
  return rows[0] || null;
}

async function sessionFor(account) {
  const participant = await query('SELECT * FROM participants WHERE account_id = $1', [account.id]);
  return {
    token: signToken(account),
    user: publicAccount(account, participant.rows[0]),
  };
}

async function ensureStaffParticipant(account, current) {
  if (current) {
    const { rows } = await query(
      `UPDATE participants SET name = $2, alias = $3, email = $4 WHERE id = $1 RETURNING *`,
      [current.id, account.display_name, account.alias, account.email]
    );
    return rows[0];
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const { rows } = await query(
        `INSERT INTO participants (
          account_id, name, alias, email, photo_token, name_token, door_code, membership, can_invite
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'staff', false) RETURNING *`,
        [account.id, account.display_name, account.alias, account.email, randomToken(), randomToken(), doorCode()]
      );
      return rows[0];
    } catch (error) {
      if (error.code !== '23505') throw error;
    }
  }
  throw httpError(500, 'Personalen kunde inte läggas i mysteriet.');
}

function cleanName(value) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text || text.length > 80 || !text.includes(' ')) throw httpError(400, 'Skriv förnamn och efternamn.');
  return text;
}

router.post(
  '/gate',
  asyncRoute(async (req, res) => {
    const door = req.body.door === 'staff' ? 'staff' : 'player';
    const name = personName(req.body);
    const existing = await findByName(name, door);
    if (existing) {
      res.json(await sessionFor(existing));
      return;
    }
    const settings = await getSettings();
    if (!settings.registration_open) throw httpError(403, 'Stängt.');
    if (door === 'player') {
      res.json({ needsProfile: true });
      return;
    }
    const passwordHash = await bcrypt.hash(randomToken(), 10);
    try {
      const created = await query(
        `INSERT INTO accounts (email, password_hash, role, display_name)
         VALUES ($1, $2, 'gamemaster', $3) RETURNING *`,
        [placeholderEmail(name, 'staff'), passwordHash, name]
      );
      res.status(201).json(await sessionFor(created.rows[0]));
    } catch (error) {
      if (error.code !== '23505') throw error;
      const again = await findByName(name, door);
      if (!again) throw error;
      res.json(await sessionFor(again));
    }
  })
);

router.post(
  '/gate-register',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    const door = req.body.door === 'staff' ? 'staff' : 'player';
    const name = personName(req.body);
    const alias = String(req.body.alias || '').trim();
    if (alias.length > 40) throw httpError(400, 'Aliaset får vara högst 40 tecken.');
    if (await findByName(name, door)) throw httpError(400, 'Det namnet finns redan. Logga in med samma namn.');

    const settings = await getSettings();
    if (!settings.registration_open) throw httpError(403, 'Stängt.');
    if (door === 'player' && !alias) throw httpError(400, 'Ange ett alias.');
    if (door === 'player' && !req.file) throw httpError(400, 'Ladda upp ett äkta porträtt, utan mask eller förklädnad.');

    const photoToken = randomToken();
    let photoPath = '';
    try {
      if (req.file) photoPath = await saveImage(req.file, env.portraitDir, `${photoToken}.jpg`);
      const created = await withTransaction(async (client) => {
        const passwordHash = await bcrypt.hash(randomToken(), 10);
        const email = placeholderEmail(name, door);
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
