import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { authenticate, loadAccount, requireRoles } from '../auth.js';
import { chipBalances, getSettings } from '../competition.js';
import { asyncRoute, httpError, param } from '../http.js';
import { doorCode, randomToken } from '../tokens.js';
import { removeFile, saveImage, upload } from '../uploads.js';
import { findByName, personName, placeholderEmail } from './auth.js';
import { env } from '../config.js';

const router = Router();

router.use(authenticate, loadAccount, requireRoles('admin', 'doorman', 'gamemaster'));

async function allowDoor(req, _res, next) {
  try {
    if (req.account.role === 'admin' || req.account.role === 'doorman') {
      next();
      return;
    }
    const { rows } = await query(
      `SELECT 1 FROM staff_posts WHERE key = 'manager' AND account_id = $1`,
      [req.account.id]
    );
    if (!rows[0]) throw httpError(403, 'Bara Managern registrerar gäster.');
    next();
  } catch (error) {
    next(error);
  }
}

router.use(allowDoor);

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
              p.costume_path IS NOT NULL AS in_mystery, p.is_first,
              inv.name AS invited_by
       FROM participants p
       LEFT JOIN participants inv ON inv.id = p.invited_by_id
       WHERE ${where} AND p.membership <> 'staff'
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
        inMystery: row.in_mystery,
        invitedBy: row.invited_by,
        // Managern ger Den Förste vampyrkorten vid registreringen. Dörrvakter ser inte vampyrer.
        ...(req.account.role === 'doorman' ? {} : { isFirst: row.is_first }),
      })),
    });
  })
);

router.post(
  '/check-in/:id',
  asyncRoute(async (req, res) => {
    // Lösenordet sägs till Bouncern vid ytterdörren. Här registreras bara att gästen har kommit.
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
  '/costume/:id',
  upload.single('costume'),
  asyncRoute(async (req, res) => {
    if (!req.file) throw httpError(400, 'Ta en bild av gästen i förklädnad.');
    const { rows } = await query('SELECT * FROM participants WHERE id = $1', [param(req.params.id)]);
    const participant = rows[0];
    if (!participant) throw httpError(404, 'Deltagaren finns inte.');
    const costumeToken = participant.costume_token || randomToken();
    const dest = await saveImage(req.file, env.portraitDir, `costume-${costumeToken}.jpg`);
    await query(
      `UPDATE participants
       SET costume_path = $2, costume_token = $3, costume_at = now()
       WHERE id = $1`,
      [participant.id, dest, costumeToken]
    );
    const settings = await getSettings();
    if (!settings.competition_closed_at && !settings.identity_open) {
      await query('UPDATE event_settings SET identity_open = true, updated_at = now() WHERE id = 1');
    }
    res.json({ ok: true, costumeToken });
  })
);

router.post(
  '/register',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    const name = personName(req.body);
    const alias = String(req.body.alias || '').trim();
    const membership = ['sus', 'sas', 'guest'].includes(req.body.membership) ? req.body.membership : 'guest';
    if (!alias || alias.length > 40) throw httpError(400, 'Ange ett alias.');
    if (!req.file) throw httpError(400, 'Ta ett äkta porträtt, utan mask eller förklädnad.');
    if (await findByName(name, 'player')) throw httpError(400, 'Det namnet finns redan. Sök fram personen i stället.');

    const photoToken = randomToken();
    let photoPath = '';
    try {
      photoPath = await saveImage(req.file, env.portraitDir, `${photoToken}.jpg`);
      const created = await withTransaction(async (client) => {
        const passwordHash = await bcrypt.hash(randomToken(), 10);
        const account = await client.query(
          `INSERT INTO accounts (email, password_hash, role, display_name)
           VALUES ($1, $2, 'participant', $3) RETURNING id`,
          [placeholderEmail(name, 'player'), passwordHash, name]
        );
        const participant = await client.query(
          `INSERT INTO participants (
            account_id, name, alias, email, photo_path, photo_token, name_token, door_code,
            membership, can_invite
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false)
          RETURNING id, name, door_code`,
          [
            account.rows[0].id,
            name,
            alias,
            placeholderEmail(name, 'player'),
            photoPath,
            photoToken,
            randomToken(),
            doorCode(),
            membership,
          ]
        );
        return participant.rows[0];
      });
      res.status(201).json({ participant: created });
    } catch (error) {
      removeFile(photoPath);
      if (error.code === '23505') throw httpError(400, 'Det namnet finns redan. Sök fram personen i stället.');
      throw error;
    }
  })
);

export default router;
