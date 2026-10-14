import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { authenticate, loadAccount, requireRoles } from '../auth.js';
import { asyncRoute, httpError, param } from '../http.js';

const router = Router();
const staffRoles = ['admin', 'doorman', 'gamemaster'];
const gameForPost = {
  holdem: 'holdem',
  sjalpoker: 'sjalpoker',
  'ride-the-bus': 'ride-the-bus',
};
const primaryPostKeys = ['manager', 'holdem', 'sjalpoker', 'ride-the-bus'];
const laterPostKeys = ['prize-master', 'bouncer'];

router.use(authenticate, loadAccount, requireRoles(...staffRoles));

async function syncGames(client, accountId) {
  const { rows } = await client.query('SELECT key FROM staff_posts WHERE account_id = $1', [accountId]);
  const gameKey = rows[0] ? gameForPost[rows[0].key] : null;
  await client.query('DELETE FROM gamemaster_games WHERE account_id = $1', [accountId]);
  if (gameKey) {
    await client.query(
      'INSERT INTO gamemaster_games (account_id, game_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [accountId, gameKey]
    );
  }
}

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      'SELECT key, title, sort_order, account_id FROM staff_posts ORDER BY sort_order, key'
    );
    const mine = rows.find((row) => row.account_id === req.account.id)?.key || null;
    res.json({
      mine,
      posts: rows.map((row) => ({
        key: row.key,
        title: row.title,
        taken: Boolean(row.account_id),
        mine: row.account_id === req.account.id,
      })),
    });
  })
);

router.post(
  '/:key/claim',
  asyncRoute(async (req, res) => {
    const key = param(req.params.key);
    try {
      await withTransaction(async (client) => {
        const post = await client.query('SELECT key, account_id FROM staff_posts WHERE key = $1 FOR UPDATE', [key]);
        if (!post.rows[0]) throw httpError(404, 'Uppdraget finns inte.');
        if (post.rows[0].account_id === req.account.id) return;
        if (post.rows[0].account_id) throw httpError(409, 'Uppdraget är redan taget.');
        if (laterPostKeys.includes(key)) {
          const primaries = await client.query(
            'SELECT account_id FROM staff_posts WHERE key = ANY($1::text[]) FOR UPDATE',
            [primaryPostKeys]
          );
          if (primaries.rows.some((row) => !row.account_id)) {
            throw httpError(409, 'Manager och de tre croupiererna ska väljas först.');
          }
        }
        const mine = await client.query('SELECT key FROM staff_posts WHERE account_id = $1 FOR UPDATE', [req.account.id]);
        if (mine.rows[0]) throw httpError(409, 'Du har redan ett uppdrag.');
        await client.query(
          'UPDATE staff_posts SET account_id = $2, claimed_at = now() WHERE key = $1',
          [key, req.account.id]
        );
        await syncGames(client, req.account.id);
      });
    } catch (error) {
      if (error.code === '23505') throw httpError(409, 'Du har redan ett uppdrag.');
      throw error;
    }
    res.json({ ok: true });
  })
);

router.get(
  '/manage',
  requireRoles('admin'),
  asyncRoute(async (req, res) => {
    const posts = await query(
      `SELECT s.key, s.title, s.sort_order, s.claimed_at, a.id AS account_id, a.email, a.display_name
       FROM staff_posts s
       LEFT JOIN accounts a ON a.id = s.account_id
       ORDER BY s.sort_order, s.key`
    );
    const accounts = await query(
      `SELECT a.id, a.email, a.role, a.display_name, s.key AS post_key
       FROM accounts a
       LEFT JOIN staff_posts s ON s.account_id = a.id
       WHERE a.active AND a.role = ANY($1::text[])
       ORDER BY COALESCE(a.display_name, a.email)`,
      [staffRoles]
    );
    res.json({
      posts: posts.rows.map((row) => ({
        key: row.key,
        title: row.title,
        claimedAt: row.claimed_at,
        holder: row.account_id
          ? { id: row.account_id, email: row.email, name: row.display_name || row.email }
          : null,
      })),
      accounts: accounts.rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        name: row.display_name || row.email,
        postKey: row.post_key,
      })),
    });
  })
);

router.post(
  '/:key/assign',
  requireRoles('admin'),
  asyncRoute(async (req, res) => {
    const key = param(req.params.key);
    const accountId = req.body.accountId || null;
    try {
      await withTransaction(async (client) => {
        const post = await client.query('SELECT account_id FROM staff_posts WHERE key = $1 FOR UPDATE', [key]);
        if (!post.rows[0]) throw httpError(404, 'Uppdraget finns inte.');
        const previousId = post.rows[0].account_id;
        if (accountId) {
          const account = await client.query(
            `SELECT id FROM accounts WHERE id = $1 AND active AND role = ANY($2::text[])`,
            [accountId, staffRoles]
          );
          if (!account.rows[0]) throw httpError(400, 'Välj ett aktivt personalkonto.');
          await client.query(
            'UPDATE staff_posts SET account_id = NULL, claimed_at = NULL WHERE account_id = $1 AND key <> $2',
            [accountId, key]
          );
        }
        await client.query(
          `UPDATE staff_posts
           SET account_id = $2, claimed_at = CASE WHEN $2::uuid IS NULL THEN NULL ELSE now() END
           WHERE key = $1`,
          [key, accountId]
        );
        if (previousId) await syncGames(client, previousId);
        if (accountId && accountId !== previousId) await syncGames(client, accountId);
      });
    } catch (error) {
      if (error.code === '23505') throw httpError(409, 'Personen har redan ett uppdrag.');
      throw error;
    }
    res.json({ ok: true });
  })
);

export default router;
