import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { authenticate, loadAccount, requireRoles } from '../auth.js';
import { chipBalances, getSettings } from '../competition.js';
import { asyncRoute, httpError, param } from '../http.js';
import { doorCode, randomToken } from '../tokens.js';
import { removeFile, saveImage, upload } from '../uploads.js';
import { env } from '../config.js';

const router = Router();

router.use(authenticate, loadAccount, requireRoles('admin', 'doorman'));

router.get(
  '/overview',
  asyncRoute(async (_req, res) => {
    const counts = await query(`
      SELECT
        count(*)::int AS registered,
        count(*) FILTER (WHERE checked_in_at IS NOT NULL)::int AS arrived,
        count(*) FILTER (WHERE base_chips_issued)::int AS chips_issued
      FROM participants
    `);
    const settings = await getSettings();
    res.json({
      registered: counts.rows[0].registered,
      arrived: counts.rows[0].arrived,
      remaining: counts.rows[0].registered - counts.rows[0].arrived,
      chipsIssued: counts.rows[0].chips_issued,
      doorPasswordSet: Boolean(settings.door_password_hash),
    });
  })
);

router.get(
  '/search',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const params = [];
    let where = 'TRUE';
    if (q) {
      params.push(`%${q}%`, q.toUpperCase());
      where = `(p.name ILIKE $1 OR p.alias ILIKE $1 OR p.email ILIKE $1 OR p.door_code = $2)`;
    }
    const { rows } = await query(
      `SELECT p.id, p.name, p.alias, p.email, p.door_code, p.membership, p.checked_in_at,
              p.base_chips_issued, p.photo_token, p.photo_path IS NOT NULL AS has_photo,
              inv.name AS invited_by
       FROM participants p
       LEFT JOIN participants inv ON inv.id = p.invited_by_id
       WHERE ${where}
       ORDER BY p.checked_in_at NULLS FIRST, p.name
       LIMIT 80`,
      params
    );
    res.json({
      participants: rows.map((row) => ({
        id: row.id,
        name: row.name,
        alias: row.alias,
        email: row.email,
        doorCode: row.door_code,
        membership: row.membership,
        checkedInAt: row.checked_in_at,
        baseChipsIssued: row.base_chips_issued,
        photoToken: row.has_photo ? row.photo_token : null,
        invitedBy: row.invited_by,
      })),
    });
  })
);

router.post(
  '/check-in/:id',
  asyncRoute(async (req, res) => {
    const settings = await getSettings();
    const spoken = String(req.body.doorPassword || '');
    const skip = Boolean(req.body.skipPassword) && req.account.role === 'admin';
    if (settings.door_password_hash && !skip) {
      const ok = await bcrypt.compare(spoken, settings.door_password_hash);
      if (!ok) throw httpError(403, 'Entrélösenordet stämmer inte.');
    }
    if (!settings.door_password_hash && !skip && req.account.role !== 'admin') {
      throw httpError(400, 'Arrangören har inte satt något entrélösenord ännu.');
    }
    const { rows } = await query('SELECT * FROM participants WHERE id = $1', [param(req.params.id)]);
    const participant = rows[0];
    if (!participant) throw httpError(404, 'Deltagaren finns inte.');
    const updated = await query(
      `UPDATE participants SET
         checked_in_at = COALESCE(checked_in_at, now()),
         base_chips = CASE WHEN base_chips_issued THEN base_chips ELSE base_chips + 100 END,
         base_chips_issued = true
       WHERE id = $1
       RETURNING id, name, checked_in_at, base_chips_issued, base_chips`,
      [participant.id]
    );
    const balances = await chipBalances(participant.id);
    res.json({ participant: updated.rows[0], balances });
  })
);

router.post(
  '/register',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const alias = String(req.body.alias || '').trim();
    const membership = ['sus', 'sas', 'guest', 'staff'].includes(req.body.membership)
      ? req.body.membership
      : 'guest';
    const canInvite = req.body.canInvite === 'true' || req.body.canInvite === true;
    if (!name || name.length > 80) throw httpError(400, 'Ange ett namn.');
    if (!alias || alias.length > 40) throw httpError(400, 'Ange ett alias.');
    if (!req.file) throw httpError(400, 'Ladda upp ett äkta porträtt, utan mask eller förklädnad.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Ange en giltig e-postadress.');
    if (password.length < 8) throw httpError(400, 'Lösenordet behöver minst 8 tecken.');

    const photoToken = randomToken();
    let photoPath = '';
    try {
      if (req.file) photoPath = await saveImage(req.file, env.portraitDir, `${photoToken}.jpg`);
      const created = await withTransaction(async (client) => {
        const existing = await client.query('SELECT id FROM accounts WHERE email = $1', [email]);
        if (existing.rows[0]) throw httpError(400, 'Den e-postadressen är redan registrerad.');
        const passwordHash = await bcrypt.hash(password, 10);
        const account = await client.query(
          `INSERT INTO accounts (email, password_hash, role) VALUES ($1, $2, 'participant') RETURNING id`,
          [email, passwordHash]
        );
        const participant = await client.query(
          `INSERT INTO participants (
            account_id, name, alias, email, photo_path, photo_token, name_token, door_code,
            membership, can_invite
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING id, name, door_code`,
          [
            account.rows[0].id,
            name,
            alias,
            email,
            photoPath || null,
            photoToken,
            randomToken(),
            doorCode(),
            membership,
            membership === 'guest' ? false : canInvite,
          ]
        );
        return participant.rows[0];
      });
      res.status(201).json({ participant: created });
    } catch (error) {
      removeFile(photoPath);
      throw error;
    }
  })
);

export default router;
