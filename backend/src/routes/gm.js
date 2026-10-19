import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, loadAccount, requireRoles } from '../auth.js';
import { chipBalances } from '../competition.js';
import { asyncRoute, httpError, param } from '../http.js';

const router = Router();

router.use(authenticate, loadAccount, requireRoles('gamemaster', 'admin'));

async function assignedKeys(req) {
  if (req.account.role === 'admin') {
    const { rows } = await query('SELECT key FROM games ORDER BY sort_order');
    return rows.map((row) => row.key);
  }
  const { rows } = await query(
    'SELECT game_key FROM gamemaster_games WHERE account_id = $1',
    [req.account.id]
  );
  return rows.map((row) => row.game_key);
}

router.get(
  '/home',
  asyncRoute(async (req, res) => {
    const keys = await assignedKeys(req);
    const games = await query(
      `SELECT key, name, summary, rules FROM games WHERE key = ANY($1::text[]) ORDER BY sort_order`,
      [keys]
    );
    const history = await query(
      `SELECT r.id, r.game_key, g.name AS game_name, r.prize_chips, r.note, r.voided,
              r.created_at, r.updated_at, p.name AS participant_name, r.recorded_by
       FROM game_results r
       JOIN games g ON g.key = r.game_key
       JOIN participants p ON p.id = r.participant_id
       WHERE r.game_key = ANY($1::text[])
         AND ($2::boolean OR r.recorded_by = $3)
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [keys, req.account.role === 'admin', req.account.id]
    );
    res.json({ games: games.rows, results: history.rows });
  })
);

router.get(
  '/participants',
  asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const params = [];
    let where = 'TRUE';
    if (q) {
      params.push(`%${q}%`, q.toUpperCase());
      where = `(name ILIKE $1 OR alias ILIKE $1 OR door_code = $2)`;
    }
    const { rows } = await query(
      `SELECT id, name, alias, door_code, checked_in_at, membership
       FROM participants WHERE ${where} ORDER BY name LIMIT 40`,
      params
    );
    const withChips = [];
    for (const row of rows) {
      const balances = await chipBalances(row.id);
      withChips.push({
        id: row.id,
        name: row.name,
        alias: row.alias,
        doorCode: row.door_code,
        checkedInAt: row.checked_in_at,
        membership: row.membership,
        prizeChips: balances.prizeChips,
      });
    }
    res.json({ participants: withChips });
  })
);

router.post(
  '/results',
  asyncRoute(async (req, res) => {
    const keys = await assignedKeys(req);
    const gameKey = String(req.body.gameKey || '');
    if (!keys.includes(gameKey)) throw httpError(403, 'Du är inte spelledare för det spelet.');
    const participantId = String(req.body.participantId || '');
    const prizeChips = Number(req.body.prizeChips);
    const note = String(req.body.note || '').trim().slice(0, 300);
    if (!Number.isInteger(prizeChips) || prizeChips < 0 || prizeChips > 50) {
      throw httpError(400, 'Ange blodspengar som ett heltal mellan 0 och 50.');
    }
    const person = await query('SELECT id FROM participants WHERE id = $1', [participantId]);
    if (!person.rows[0]) throw httpError(404, 'Deltagaren finns inte.');
    const { rows } = await query(
      `INSERT INTO game_results (game_key, participant_id, prize_chips, note, recorded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [gameKey, participantId, prizeChips, note || null, req.account.id]
    );
    const balances = await chipBalances(participantId);
    res.status(201).json({ id: rows[0].id, balances });
  })
);

router.patch(
  '/results/:id',
  asyncRoute(async (req, res) => {
    const keys = await assignedKeys(req);
    const existing = await query('SELECT * FROM game_results WHERE id = $1', [param(req.params.id)]);
    const row = existing.rows[0];
    if (!row || !keys.includes(row.game_key)) throw httpError(404, 'Registreringen finns inte.');
    if (req.account.role !== 'admin' && row.recorded_by !== req.account.id) {
      throw httpError(403, 'Du kan bara rätta dina egna registreringar.');
    }
    const prizeChips = req.body.prizeChips === undefined ? row.prize_chips : Number(req.body.prizeChips);
    if (!Number.isInteger(prizeChips) || prizeChips < 0 || prizeChips > 50) {
      throw httpError(400, 'Ange blodspengar som ett heltal mellan 0 och 50.');
    }
    const note = req.body.note === undefined ? row.note : String(req.body.note || '').trim().slice(0, 300);
    const voided = req.body.voided === undefined ? row.voided : Boolean(req.body.voided);
    await query(
      `UPDATE game_results
       SET prize_chips = $2, note = $3, voided = $4, updated_at = now()
       WHERE id = $1`,
      [row.id, prizeChips, note || null, voided]
    );
    const balances = await chipBalances(row.participant_id);
    res.json({ ok: true, balances });
  })
);

export default router;
