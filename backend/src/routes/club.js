import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { authenticate, loadAccount, requireRoles } from '../auth.js';
import { chipBalances, getSettings, presentScore } from '../competition.js';
import { asyncRoute, httpError, param } from '../http.js';
import { randomToken } from '../tokens.js';

const router = Router();
const MAX_GUEST_INVITES = 2;

router.use(authenticate, loadAccount, requireRoles('participant', 'admin'));

function requireParticipant(req) {
  if (!req.participant) throw httpError(403, 'Kontot är inte kopplat till en deltagare.');
  return req.participant;
}

router.get(
  '/home',
  asyncRoute(async (req, res) => {
    const participant = requireParticipant(req);
    const settings = await getSettings();
    const balances = await chipBalances(participant.id);
    const invites = await query(
      `SELECT id, token, label, used_at, revoked_at, created_at
       FROM invitations
       WHERE inviter_id = $1 AND kind = 'guest'
       ORDER BY created_at`,
      [participant.id]
    );
    const activeInvites = invites.rows.filter((row) => !row.revoked_at);
    let score = null;
    if (settings.results_revealed) {
      const snap = await query('SELECT * FROM score_snapshots WHERE participant_id = $1', [participant.id]);
      score = presentScore(snap.rows[0]);
    }
    const identityCount = await query(
      'SELECT count(*)::int AS n FROM identity_guesses WHERE guesser_id = $1',
      [participant.id]
    );
    const vampireCount = await query(
      'SELECT count(*)::int AS n FROM vampire_guesses WHERE guesser_id = $1',
      [participant.id]
    );
    res.json({
      participant: {
        id: participant.id,
        name: participant.name,
        alias: participant.alias,
        membership: participant.membership,
        canInvite: participant.can_invite,
        checkedIn: Boolean(participant.checked_in_at),
        baseChipsIssued: participant.base_chips_issued,
        isVampire: participant.is_vampire,
        vampireBonusGranted: participant.vampire_bonus_granted,
        doorCode: participant.door_code,
        photoToken: participant.photo_token,
        hasPhoto: Boolean(participant.photo_path),
      },
      balances,
      invitations: {
        max: MAX_GUEST_INVITES,
        used: activeInvites.length,
        items: participant.can_invite ? invites.rows : [],
      },
      phases: {
        registrationOpen: settings.registration_open,
        identityOpen: settings.identity_open,
        conversionsOpen: settings.vampire_conversions_open,
        resultsRevealed: settings.results_revealed,
        competitionClosed: Boolean(settings.competition_closed_at),
        useAliases: settings.use_aliases,
      },
      counts: {
        identityGuesses: identityCount.rows[0].n,
        vampireGuesses: vampireCount.rows[0].n,
      },
      score,
    });
  })
);

router.get(
  '/mystery',
  asyncRoute(async (req, res) => {
    const participant = requireParticipant(req);
    const settings = await getSettings();
    const people = await query(
      `SELECT id, name, alias, membership, photo_token, name_token, photo_path,
              costume_token, costume_path, costume_at, is_vampire
       FROM participants ORDER BY name`
    );
    const mineIdentity = await query(
      `SELECT g.photo_participant_id, g.guessed_participant_id
       FROM identity_guesses g WHERE g.guesser_id = $1`,
      [participant.id]
    );
    const mineVampire = await query(
      'SELECT subject_id, suspects FROM vampire_guesses WHERE guesser_id = $1',
      [participant.id]
    );
    const byId = new Map(people.rows.map((row) => [row.id, row]));
    const costumes = people.rows
      .filter((row) => row.costume_path && row.costume_token)
      .sort((a, b) => new Date(a.costume_at || 0) - new Date(b.costume_at || 0) || a.name.localeCompare(b.name, 'sv'))
      .map((row) => ({
        costumeToken: row.costume_token,
        ...(settings.results_revealed ? { name: row.name, isVampire: row.is_vampire } : {}),
      }));
    const identities = people.rows
      .filter((row) => row.photo_path || row.membership === 'staff')
      .map((row) => ({
        nameToken: row.name_token,
        name: row.name,
        photoToken: row.photo_path ? row.photo_token : null,
        ...(settings.results_revealed ? { isVampire: row.is_vampire } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'));

    let score = null;
    let leaderboard = null;
    if (settings.results_revealed) {
      const snaps = await query(
        `SELECT s.*, p.name FROM score_snapshots s
         JOIN participants p ON p.id = s.participant_id
         ORDER BY s.total_points DESC, p.name`
      );
      score = presentScore(snaps.rows.find((row) => row.participant_id === participant.id));
      leaderboard = snaps.rows.map((row) => ({
        name: row.name,
        total: row.total_points,
        identityPoints: row.identity_points,
        vampirePoints: row.vampire_points,
        isVampire: row.is_vampire,
        isWinner: row.is_winner,
        tiedForLead: row.tied_for_lead,
        isYou: row.participant_id === participant.id,
      }));
    }

    res.json({
      locked: false,
      revealed: settings.results_revealed,
      canGuess: settings.identity_open,
      costumes,
      identities,
      identityGuesses: mineIdentity.rows.map((row) => {
        const photo = byId.get(row.photo_participant_id);
        const guessed = byId.get(row.guessed_participant_id);
        return {
          costumeToken: photo?.costume_token,
          nameToken: guessed?.name_token,
          name: guessed?.name,
          ...(settings.results_revealed ? { correct: row.photo_participant_id === row.guessed_participant_id } : {}),
        };
      }).filter((row) => row.costumeToken),
      vampireGuesses: mineVampire.rows.map((row) => {
        const subject = byId.get(row.subject_id);
        return {
          costumeToken: subject?.costume_token,
          suspects: row.suspects,
          ...(settings.results_revealed ? { correct: row.suspects === Boolean(subject?.is_vampire) } : {}),
        };
      }).filter((row) => row.costumeToken),
      score,
      leaderboard,
    });
  })
);

router.put(
  '/mystery/identity',
  asyncRoute(async (req, res) => {
    const participant = requireParticipant(req);
    const settings = await getSettings();
    if (!settings.identity_open) throw httpError(403, 'Identitetsmysteriet är stängt.');
    const costumeToken = String(req.body.costumeToken || '');
    const nameToken = req.body.nameToken ? String(req.body.nameToken) : null;
    const photo = await query(
      'SELECT id FROM participants WHERE costume_token = $1 AND costume_path IS NOT NULL',
      [costumeToken]
    );
    if (!photo.rows[0]) throw httpError(404, 'Förklädnaden finns inte i mysteriet.');
    const photoId = photo.rows[0].id;
    if (!nameToken) {
      await query(
        'DELETE FROM identity_guesses WHERE guesser_id = $1 AND photo_participant_id = $2',
        [participant.id, photoId]
      );
      return res.json({ ok: true });
    }
    const named = await query('SELECT id FROM participants WHERE name_token = $1', [nameToken]);
    if (!named.rows[0]) throw httpError(404, 'Namnet finns inte.');
    const guessedId = named.rows[0].id;
    await withTransaction(async (client) => {
      await client.query(
        `DELETE FROM identity_guesses
         WHERE guesser_id = $1 AND guessed_participant_id = $2 AND photo_participant_id <> $3`,
        [participant.id, guessedId, photoId]
      );
      await client.query(
        `INSERT INTO identity_guesses (guesser_id, photo_participant_id, guessed_participant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (guesser_id, photo_participant_id)
         DO UPDATE SET guessed_participant_id = EXCLUDED.guessed_participant_id, updated_at = now()`,
        [participant.id, photoId, guessedId]
      );
    });
    res.json({ ok: true });
  })
);

router.put(
  '/mystery/vampire',
  asyncRoute(async (req, res) => {
    const participant = requireParticipant(req);
    const settings = await getSettings();
    if (!settings.identity_open) throw httpError(403, 'Vampyrgissningarna är stängda.');
    const costumeToken = String(req.body.costumeToken || '');
    const subject = await query(
      'SELECT id FROM participants WHERE costume_token = $1 AND costume_path IS NOT NULL',
      [costumeToken]
    );
    if (!subject.rows[0]) throw httpError(404, 'Förklädnaden finns inte i mysteriet.');
    const subjectId = subject.rows[0].id;
    const existing = await query(
      'SELECT 1 FROM vampire_guesses WHERE guesser_id = $1 AND subject_id = $2',
      [participant.id, subjectId]
    );
    if (existing.rows[0]) throw httpError(409, 'Det går inte att ändra vampyrgissningen.');
    await query(
      `INSERT INTO vampire_guesses (guesser_id, subject_id, suspects)
       VALUES ($1, $2, true)`,
      [participant.id, subjectId]
    );
    res.json({ ok: true });
  })
);

router.post(
  '/invitations',
  asyncRoute(async (req, res) => {
    const participant = requireParticipant(req);
    if (!participant.can_invite) throw httpError(403, 'Du har ingen inbjudningsrätt.');
    const settings = await getSettings();
    if (!settings.registration_open) throw httpError(403, 'Registreringen är stängd.');
    const label = String(req.body.label || '').trim().slice(0, 80);
    const count = await query(
      `SELECT count(*)::int AS n FROM invitations
       WHERE inviter_id = $1 AND kind = 'guest' AND revoked_at IS NULL`,
      [participant.id]
    );
    if (count.rows[0].n >= MAX_GUEST_INVITES) {
      throw httpError(400, 'Du har redan två inbjudningar.');
    }
    const token = randomToken();
    const { rows } = await query(
      `INSERT INTO invitations (token, inviter_id, created_by_account, label, kind, membership)
       VALUES ($1, $2, $3, $4, 'guest', 'guest') RETURNING id, token, label, created_at`,
      [token, participant.id, req.account.id, label || null]
    );
    res.status(201).json({ invitation: rows[0] });
  })
);

router.post(
  '/invitations/:id/revoke',
  asyncRoute(async (req, res) => {
    const participant = requireParticipant(req);
    const { rows } = await query(
      `UPDATE invitations SET revoked_at = now()
       WHERE id = $1 AND inviter_id = $2 AND used_at IS NULL AND revoked_at IS NULL
       RETURNING id`,
      [param(req.params.id), participant.id]
    );
    if (!rows[0]) throw httpError(400, 'Inbjudan kan inte dras tillbaka.');
    res.json({ ok: true });
  })
);

export default router;
