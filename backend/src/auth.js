import jwt from 'jsonwebtoken';
import { env } from './config.js';
import { query } from './db.js';
import { httpError } from './http.js';

export function signToken(account) {
  return jwt.sign({ sub: account.id, role: account.role }, env.jwtSecret, { expiresIn: '18h' });
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Logga in först.' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), env.jwtSecret);
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Inloggningen har gått ut. Logga in igen.' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Logga in först.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Den här delen är stängd för ditt konto.' });
    }
    next();
  };
}

export async function loadAccount(req, _res, next) {
  try {
    const { rows } = await query(
      'SELECT id, email, role, active, staff_intro_seen FROM accounts WHERE id = $1',
      [req.user.id]
    );
    const account = rows[0];
    if (!account || !account.active) throw httpError(401, 'Kontot är inte aktivt.');
    req.account = account;
    const participant = await query('SELECT * FROM participants WHERE account_id = $1', [account.id]);
    req.participant = participant.rows[0] || null;
    next();
  } catch (error) {
    next(error);
  }
}

export function publicAccount(account, participant) {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    staffIntroSeen: account.staff_intro_seen === true,
    participant: participant
      ? {
          id: participant.id,
          name: participant.name,
          alias: participant.alias,
          canInvite: participant.can_invite,
          checkedIn: Boolean(participant.checked_in_at),
          isVampire: participant.is_vampire,
          membership: participant.membership,
        }
      : null,
  };
}
