import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authenticate, loadAccount, publicAccount, signToken } from '../auth.js';
import { asyncRoute, httpError } from '../http.js';

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
