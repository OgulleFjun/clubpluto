import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { getSettings } from '../competition.js';
import { publicAccount, signToken } from '../auth.js';
import { asyncRoute, httpError, param } from '../http.js';
import { doorCode, randomToken } from '../tokens.js';
import { removeFile, saveImage, upload } from '../uploads.js';
import { env } from '../config.js';

const router = Router();

function cleanName(value, label, max) {
  const text = String(value || '').trim();
  if (!text || text.length > max) throw httpError(400, `${label} behöver 1–${max} tecken.`);
  return text;
}

router.get(
  '/:token',
  asyncRoute(async (req, res) => {
    const settings = await getSettings();
    const { rows } = await query(
      `SELECT i.*, p.name AS inviter_name
       FROM invitations i
       LEFT JOIN participants p ON p.id = i.inviter_id
       WHERE i.token = $1`,
      [param(req.params.token)]
    );
    const invite = rows[0];
    if (!invite || invite.revoked_at) {
      return res.json({ valid: false, reason: 'Ogiltig inbjudan.', clubName: settings.club_name });
    }
    if (invite.used_at) {
      return res.json({ valid: false, reason: 'Inbjudan är redan använd.', clubName: settings.club_name });
    }
    if (!settings.registration_open) {
      return res.json({
        valid: false,
        reason: 'Registreringen är stängd. Prata med arrangören i dörren.',
        clubName: settings.club_name,
      });
    }
    res.json({
      valid: true,
      clubName: settings.club_name,
      tagline: settings.tagline,
      eventStartsAt: settings.event_starts_at,
      location: settings.location,
      inviterName: invite.inviter_name,
      membership: invite.membership,
      grantsInvite: invite.grants_invite,
    });
  })
);

router.post(
  '/:token',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    const settings = await getSettings();
    if (!settings.registration_open) throw httpError(403, 'Registreringen är stängd.');
    const name = cleanName(req.body.name, 'Namn', 80);
    const alias = String(req.body.alias || '').trim();
    if (alias.length > 40) throw httpError(400, 'Alias får vara högst 40 tecken.');
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Ange en giltig e-postadress.');
    const password = String(req.body.password || '');
    if (password.length < 8) throw httpError(400, 'Lösenordet behöver minst 8 tecken.');
    if (!req.file) throw httpError(400, 'Ladda upp ett porträtt utan förklädnad.');

    const photoToken = randomToken();
    let photoPath = '';
    try {
      photoPath = await saveImage(req.file, env.portraitDir, `${photoToken}.jpg`);
      const created = await withTransaction(async (client) => {
        const inviteResult = await client.query(
          'SELECT * FROM invitations WHERE token = $1 FOR UPDATE',
          [param(req.params.token)]
        );
        const invite = inviteResult.rows[0];
        if (!invite || invite.revoked_at) throw httpError(400, 'Inbjudan gäller inte.');
        if (invite.used_at) throw httpError(400, 'Inbjudan är redan använd.');
        const existing = await client.query('SELECT id FROM accounts WHERE email = $1', [email]);
        if (existing.rows[0]) throw httpError(400, 'Den e-postadressen är redan registrerad.');
        const passwordHash = await bcrypt.hash(password, 10);
        const account = await client.query(
          `INSERT INTO accounts (email, password_hash, role) VALUES ($1, $2, 'participant') RETURNING *`,
          [email, passwordHash]
        );
        const participant = await client.query(
          `INSERT INTO participants (
            account_id, name, alias, email, photo_path, photo_token, name_token, door_code,
            membership, can_invite, invited_by_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [
            account.rows[0].id,
            name,
            alias || null,
            email,
            photoPath,
            photoToken,
            randomToken(),
            doorCode(),
            invite.membership,
            invite.kind === 'staff' ? invite.grants_invite : false,
            invite.inviter_id,
          ]
        );
        await client.query(
          `UPDATE invitations SET used_by_id = $2, used_at = now() WHERE id = $1`,
          [invite.id, participant.rows[0].id]
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

export default router;
