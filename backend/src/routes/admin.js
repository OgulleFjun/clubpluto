import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { authenticate, loadAccount, requireRoles } from '../auth.js';
import {
  chipBalances,
  currentLeaderboard,
  getSettings,
  presentScore,
  presentSettings,
  saveSnapshots,
} from '../competition.js';
import { asyncRoute, httpError, param } from '../http.js';
import { doorCode, randomToken } from '../tokens.js';
import { vampireBonusDecision } from '../scoring.js';
import { removeFile, saveImage, upload } from '../uploads.js';
import { env } from '../config.js';

const router = Router();
router.use(authenticate, loadAccount, requireRoles('admin'));

const memberships = ['sus', 'sas', 'guest', 'staff'];

router.get(
  '/overview',
  asyncRoute(async (_req, res) => {
    const counts = await query(`
      SELECT
        count(*)::int AS registered,
        count(*) FILTER (WHERE checked_in_at IS NOT NULL)::int AS arrived,
        count(*) FILTER (WHERE is_vampire)::int AS vampires
      FROM participants
    `);
    const settings = await getSettings();
    const first = await query(
      `SELECT name FROM participants WHERE is_first AND is_vampire LIMIT 1`
    );
    res.json({
      ...counts.rows[0],
      remaining: counts.rows[0].registered - counts.rows[0].arrived,
      firstVampire: first.rows[0]?.name || null,
      settings: presentSettings(settings, { includeSecrets: true }),
    });
  })
);

router.get(
  '/participants',
  asyncRoute(async (_req, res) => {
    const { rows } = await query(`
      SELECT p.*, inv.name AS invited_by, turner.name AS turned_by_name
      FROM participants p
      LEFT JOIN participants inv ON inv.id = p.invited_by_id
      LEFT JOIN participants turner ON turner.id = p.turned_by_id
      ORDER BY p.name
    `);
    const list = [];
    for (const row of rows) {
      const balances = await chipBalances(row.id);
      list.push(presentParticipant(row, balances));
    }
    res.json({ participants: list });
  })
);

function presentParticipant(row, balances) {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias,
    email: row.email,
    membership: row.membership,
    canInvite: row.can_invite,
    checkedInAt: row.checked_in_at,
    baseChipsIssued: row.base_chips_issued,
    isVampire: row.is_vampire,
    isFirst: row.is_first,
    vampireAt: row.vampire_at,
    turnedBy: row.turned_by_name || null,
    vampireBonusGranted: row.vampire_bonus_granted,
    doorCode: row.door_code,
    photoToken: row.photo_path ? row.photo_token : null,
    invitedBy: row.invited_by || null,
    notes: row.notes,
    createdAt: row.created_at,
    baseChips: balances.baseChips,
    prizeChips: balances.prizeChips,
  };
}

router.patch(
  '/participants/:id',
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM participants WHERE id = $1', [param(req.params.id)]);
    const current = rows[0];
    if (!current) throw httpError(404, 'Deltagaren finns inte.');
    const name = req.body.name === undefined ? current.name : String(req.body.name).trim();
    const alias = req.body.alias === undefined ? current.alias : String(req.body.alias || '').trim() || null;
    const notes = req.body.notes === undefined ? current.notes : String(req.body.notes || '').trim() || null;
    const membership = req.body.membership === undefined ? current.membership : req.body.membership;
    if (!name || name.length > 80) throw httpError(400, 'Ange ett namn.');
    if (!memberships.includes(membership)) throw httpError(400, 'Ogiltig medlemstyp.');
    const canInvite = req.body.canInvite === undefined ? current.can_invite : Boolean(req.body.canInvite);
    let email = current.email;
    if (req.body.email !== undefined) {
      email = String(req.body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Ogiltig e-postadress.');
      const clash = await query(
        'SELECT id FROM accounts WHERE email = $1 AND id <> $2',
        [email, current.account_id]
      );
      if (clash.rows[0]) throw httpError(400, 'E-postadressen används redan.');
    }
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE participants
         SET name = $2, alias = $3, notes = $4, membership = $5, can_invite = $6, email = $7
         WHERE id = $1`,
        [current.id, name, alias, notes, membership, canInvite, email]
      );
      if (current.account_id && email !== current.email) {
        await client.query('UPDATE accounts SET email = $2 WHERE id = $1', [current.account_id, email]);
      }
    });
    res.json({ ok: true });
  })
);

router.post(
  '/participants/:id/photo',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM participants WHERE id = $1', [param(req.params.id)]);
    const current = rows[0];
    if (!current) throw httpError(404, 'Deltagaren finns inte.');
    if (!req.file) throw httpError(400, 'Välj en bild.');
    const dest = await saveImage(req.file, env.portraitDir, `${current.photo_token}.jpg`);
    await query('UPDATE participants SET photo_path = $2 WHERE id = $1', [current.id, dest]);
    res.json({ ok: true, photoToken: current.photo_token });
  })
);

router.delete(
  '/participants/:id',
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM participants WHERE id = $1', [param(req.params.id)]);
    const current = rows[0];
    if (!current) throw httpError(404, 'Deltagaren finns inte.');
    await withTransaction(async (client) => {
      await client.query('DELETE FROM participants WHERE id = $1', [current.id]);
      if (current.account_id) await client.query('DELETE FROM accounts WHERE id = $1', [current.account_id]);
    });
    removeFile(current.photo_path);
    res.json({ ok: true });
  })
);

router.post(
  '/participants/:id/arrival',
  asyncRoute(async (req, res) => {
    const present = Boolean(req.body.present);
    await query(
      `UPDATE participants SET checked_in_at = CASE WHEN $2 THEN COALESCE(checked_in_at, now()) ELSE NULL END
       WHERE id = $1`,
      [param(req.params.id), present]
    );
    res.json({ ok: true });
  })
);

router.get(
  '/invitations',
  asyncRoute(async (_req, res) => {
    const { rows } = await query(`
      SELECT i.*, inv.name AS inviter_name, used.name AS used_by_name
      FROM invitations i
      LEFT JOIN participants inv ON inv.id = i.inviter_id
      LEFT JOIN participants used ON used.id = i.used_by_id
      ORDER BY i.created_at DESC
    `);
    res.json({
      invitations: rows.map((row) => ({
        id: row.id,
        token: row.token,
        label: row.label,
        kind: row.kind,
        membership: row.membership,
        grantsInvite: row.grants_invite,
        inviterName: row.inviter_name,
        usedByName: row.used_by_name,
        usedAt: row.used_at,
        revokedAt: row.revoked_at,
        createdAt: row.created_at,
      })),
    });
  })
);

router.post(
  '/invitations',
  asyncRoute(async (req, res) => {
    const membership = memberships.includes(req.body.membership) ? req.body.membership : 'guest';
    const grantsInvite = Boolean(req.body.grantsInvite) && membership !== 'guest';
    const label = String(req.body.label || '').trim().slice(0, 80) || null;
    const token = randomToken();
    const { rows } = await query(
      `INSERT INTO invitations (
        token, created_by_account, label, kind, grants_invite, membership
      ) VALUES ($1, $2, $3, 'staff', $4, $5)
      RETURNING id, token`,
      [token, req.account.id, label, grantsInvite, membership]
    );
    res.status(201).json({ invitation: rows[0] });
  })
);

router.post(
  '/invitations/:id/revoke',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      `UPDATE invitations SET revoked_at = now()
       WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL RETURNING id`,
      [param(req.params.id)]
    );
    if (!rows[0]) throw httpError(400, 'Inbjudan kan inte dras tillbaka.');
    res.json({ ok: true });
  })
);

router.patch(
  '/settings',
  asyncRoute(async (req, res) => {
    const settings = await getSettings();
    const tieBreak = ['shared', 'earliest', 'manual'].includes(req.body.tieBreak)
      ? req.body.tieBreak
      : settings.tie_break;
    await query(
      `UPDATE event_settings SET
        club_name = $1,
        tagline = $2,
        event_starts_at = $3,
        location = $4,
        public_intro = $5,
        rules_text = $6,
        registration_open = $7,
        identity_open = $8,
        vampire_conversions_open = $9,
        use_aliases = $10,
        first_vampire_gets_bonus = $11,
        tie_break = $12,
        updated_at = now()
       WHERE id = 1`,
      [
        textOr(req.body.clubName, settings.club_name),
        textOr(req.body.tagline, settings.tagline),
        req.body.eventStartsAt ? new Date(req.body.eventStartsAt) : settings.event_starts_at,
        textOr(req.body.location, settings.location),
        req.body.publicIntro === undefined ? settings.public_intro : String(req.body.publicIntro),
        req.body.rulesText === undefined ? settings.rules_text : String(req.body.rulesText),
        boolOr(req.body.registrationOpen, settings.registration_open),
        boolOr(req.body.identityOpen, settings.identity_open),
        boolOr(req.body.vampireConversionsOpen, settings.vampire_conversions_open),
        boolOr(req.body.useAliases, settings.use_aliases),
        boolOr(req.body.firstVampireGetsBonus, settings.first_vampire_gets_bonus),
        tieBreak,
      ]
    );
    if (Array.isArray(req.body.games)) {
      for (const game of req.body.games) {
        await query(
          `UPDATE games SET name = COALESCE($2, name), summary = COALESCE($3, summary), rules = COALESCE($4, rules)
           WHERE key = $1`,
          [game.key, game.name ?? null, game.summary ?? null, game.rules ?? null]
        );
      }
    }
    const next = await getSettings();
    res.json({ settings: presentSettings(next, { includeSecrets: true }) });
  })
);

router.post(
  '/door-password',
  asyncRoute(async (req, res) => {
    const password = String(req.body.password || '');
    if (!password) {
      await query('UPDATE event_settings SET door_password_hash = NULL, updated_at = now() WHERE id = 1');
      return res.json({ doorPasswordSet: false });
    }
    if (password.length < 4) throw httpError(400, 'Entrélösenordet behöver minst 4 tecken.');
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE event_settings SET door_password_hash = $1, updated_at = now() WHERE id = 1', [hash]);
    res.json({ doorPasswordSet: true });
  })
);

router.get(
  '/scores',
  asyncRoute(async (_req, res) => {
    const { board, settings } = await currentLeaderboard();
    res.json({
      live: true,
      tieBreak: settings.tie_break,
      revealed: settings.results_revealed,
      rows: board.map((row) => ({
        id: row.id,
        name: row.name,
        total: row.total,
        identityPoints: row.identityPoints,
        vampirePoints: row.vampirePoints,
        identityCorrect: row.identityCorrect,
        identityWrong: row.identityWrong,
        vampireCorrect: row.vampireCorrect,
        vampireWrong: row.vampireWrong,
        isVampire: row.isVampire,
        isWinner: row.isWinner,
        tiedForLead: row.tiedForLead,
      })),
    });
  })
);

router.get(
  '/guesses',
  asyncRoute(async (_req, res) => {
    const { participants, maps } = await currentLeaderboard();
    const byId = new Map(participants.map((row) => [row.id, row]));
    const guessers = participants.map((person) => ({
      id: person.id,
      name: person.name,
      identity: (maps.identityByGuesser.get(person.id) || []).map((guess) => ({
        photoName: byId.get(guess.photoId)?.name,
        guessedName: byId.get(guess.guessedId)?.name,
        correct: guess.photoId === guess.guessedId,
      })),
      vampire: (maps.vampireByGuesser.get(person.id) || []).map((guess) => ({
        name: byId.get(guess.subjectId)?.name,
        suspects: guess.suspects,
        actual: Boolean(byId.get(guess.subjectId)?.is_vampire),
        correct: guess.suspects === Boolean(byId.get(guess.subjectId)?.is_vampire),
      })),
    }));
    res.json({ guessers });
  })
);

router.post(
  '/competition/close',
  asyncRoute(async (_req, res) => {
    const { board } = await currentLeaderboard();
    await withTransaction(async (client) => {
      await saveSnapshots(client, board);
      await client.query(
        `UPDATE event_settings SET
          identity_open = false,
          vampire_conversions_open = false,
          competition_closed_at = COALESCE(competition_closed_at, now()),
          updated_at = now()
         WHERE id = 1`
      );
    });
    res.json({ ok: true, rows: board.length });
  })
);

router.post(
  '/competition/recompute',
  asyncRoute(async (_req, res) => {
    const { board } = await currentLeaderboard();
    await withTransaction(async (client) => {
      await saveSnapshots(client, board);
    });
    res.json({ ok: true });
  })
);

router.post(
  '/competition/reveal',
  asyncRoute(async (_req, res) => {
    const existing = await query('SELECT 1 FROM score_snapshots LIMIT 1');
    if (!existing.rows[0]) {
      const { board } = await currentLeaderboard();
      await withTransaction(async (client) => {
        await saveSnapshots(client, board);
        await client.query(
          `UPDATE event_settings SET
            identity_open = false,
            vampire_conversions_open = false,
            competition_closed_at = COALESCE(competition_closed_at, now())
           WHERE id = 1`
        );
      });
    }
    await query(
      'UPDATE event_settings SET results_revealed = true, updated_at = now() WHERE id = 1'
    );
    res.json({ ok: true });
  })
);

router.post(
  '/competition/hide',
  asyncRoute(async (_req, res) => {
    await query('UPDATE event_settings SET results_revealed = false, updated_at = now() WHERE id = 1');
    res.json({ ok: true });
  })
);

router.post(
  '/competition/winner',
  asyncRoute(async (req, res) => {
    const id = String(req.body.participantId || '');
    const snap = await query('SELECT * FROM score_snapshots WHERE participant_id = $1', [id]);
    const row = snap.rows[0];
    if (!row) throw httpError(404, 'Personen saknas i resultatlistan. Stäng tävlingen först.');
    if (row.is_vampire) throw httpError(400, 'En vampyr kan inte vinna överlevnadspriset.');
    const max = await query('SELECT max(total_points) AS m FROM score_snapshots WHERE NOT is_vampire');
    if (Number(row.total_points) !== Number(max.rows[0].m)) {
      throw httpError(400, 'Personen har inte högst poäng bland människorna.');
    }
    await query('UPDATE score_snapshots SET is_winner = (participant_id = $1)', [id]);
    res.json({ ok: true, score: presentScore(row) });
  })
);

router.post(
  '/vampires/first',
  asyncRoute(async (req, res) => {
    const settings = await getSettings();
    const existing = await query('SELECT id, name FROM participants WHERE is_first');
    if (existing.rows[0]) throw httpError(409, `${existing.rows[0].name} är redan Den Förste.`);
    const pool = req.body.pool === 'registered' ? 'registered' : 'checked_in';
    const where = pool === 'checked_in'
      ? `checked_in_at IS NOT NULL AND NOT is_vampire AND membership <> 'staff'`
      : `NOT is_vampire AND membership <> 'staff'`;
    const candidates = await query(`SELECT id, name, vampire_bonus_granted FROM participants WHERE ${where}`);
    if (!candidates.rows.length) throw httpError(400, 'Ingen deltagare kan väljas i den gruppen.');
    const pick = candidates.rows[Math.floor(Math.random() * candidates.rows.length)];
    const bonus = vampireBonusDecision({
      alreadyGranted: pick.vampire_bonus_granted,
      isFirstSelection: true,
      firstGetsBonus: settings.first_vampire_gets_bonus,
    });
    await applyVampire(pick.id, null, true, bonus);
    res.json({ name: pick.name, bonusGranted: Boolean(bonus) });
  })
);

router.post(
  '/vampires',
  asyncRoute(async (req, res) => {
    const id = String(req.body.participantId || '');
    const turnedById = req.body.turnedById ? String(req.body.turnedById) : null;
    const { rows } = await query('SELECT * FROM participants WHERE id = $1', [id]);
    const person = rows[0];
    if (!person) throw httpError(404, 'Deltagaren finns inte.');
    if (person.is_vampire) throw httpError(409, 'Personen är redan vampyr.');
    if (turnedById) {
      const turner = await query('SELECT id, is_vampire FROM participants WHERE id = $1', [turnedById]);
      if (!turner.rows[0]?.is_vampire) throw httpError(400, 'Den som förvandlar behöver själv vara vampyr.');
    }
    const bonus = vampireBonusDecision({
      alreadyGranted: person.vampire_bonus_granted,
      isFirstSelection: false,
      firstGetsBonus: true,
    });
    await applyVampire(person.id, turnedById, false, bonus);
    res.json({ ok: true, bonusGranted: Boolean(bonus) });
  })
);

router.post(
  '/vampires/:id/bonus',
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM participants WHERE id = $1', [param(req.params.id)]);
    const person = rows[0];
    if (!person?.is_vampire) throw httpError(400, 'Personen är inte vampyr.');
    const bonus = vampireBonusDecision({
      alreadyGranted: person.vampire_bonus_granted,
      isFirstSelection: false,
      firstGetsBonus: true,
    });
    if (!bonus) throw httpError(409, 'Bonusen är redan given.');
    await query(
      `UPDATE participants
       SET base_chips = base_chips + $2, vampire_bonus_granted = true
       WHERE id = $1`,
      [person.id, bonus.baseChips]
    );
    res.json({ ok: true });
  })
);

router.post(
  '/vampires/:id/revoke',
  asyncRoute(async (req, res) => {
    const { rows } = await query(
      `UPDATE participants
       SET is_vampire = false, is_first = false, vampire_at = NULL, turned_by_id = NULL
       WHERE id = $1 RETURNING id`,
      [param(req.params.id)]
    );
    if (!rows[0]) throw httpError(404, 'Deltagaren finns inte.');
    res.json({ ok: true, message: 'Vampyrstatusen är borttagen. Eventuell bonus lämnas kvar så den inte kan ges en gång till.' });
  })
);

async function applyVampire(id, turnedById, isFirst, bonus) {
  await query(
    `UPDATE participants SET
      is_vampire = true,
      is_first = $2,
      vampire_at = now(),
      turned_by_id = $3,
      base_chips = base_chips + $4,
      vampire_bonus_granted = vampire_bonus_granted OR $5
     WHERE id = $1`,
    [id, isFirst, turnedById, bonus ? bonus.baseChips : 0, Boolean(bonus)]
  );
}

router.get(
  '/prizes',
  asyncRoute(async (_req, res) => {
    const prizes = await query('SELECT * FROM prizes ORDER BY sort_order, cost, name');
    const redemptions = await query(
      `SELECT r.id, r.quantity, r.note, r.created_at, p.name AS participant_name, z.name AS prize_name, z.cost
       FROM prize_redemptions r
       JOIN participants p ON p.id = r.participant_id
       JOIN prizes z ON z.id = r.prize_id
       ORDER BY r.created_at DESC LIMIT 100`
    );
    res.json({
      prizes: prizes.rows.map(presentPrize),
      redemptions: redemptions.rows,
    });
  })
);

function presentPrize(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cost: row.cost,
    stock: row.stock,
    active: row.active,
    sortOrder: row.sort_order,
    imageUrl: row.image_path ? `/api/public/prize-images/${row.id}` : null,
  };
}

router.post(
  '/prizes',
  asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '');
    const cost = Number(req.body.cost);
    const stock = Number(req.body.stock);
    if (!name) throw httpError(400, 'Priset behöver ett namn.');
    if (!Number.isInteger(cost) || cost < 2) throw httpError(400, 'Priset behöver kosta minst 2 prismarker.');
    if (!Number.isInteger(stock) || stock < 0) throw httpError(400, 'Antalet behöver vara noll eller högre.');
    const { rows } = await query(
      `INSERT INTO prizes (name, description, cost, stock, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, description, cost, stock, Number(req.body.sortOrder) || 0]
    );
    res.status(201).json({ id: rows[0].id });
  })
);

router.patch(
  '/prizes/:id',
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM prizes WHERE id = $1', [param(req.params.id)]);
    const prize = rows[0];
    if (!prize) throw httpError(404, 'Priset finns inte.');
    const cost = req.body.cost === undefined ? prize.cost : Number(req.body.cost);
    const stock = req.body.stock === undefined ? prize.stock : Number(req.body.stock);
    if (!Number.isInteger(cost) || cost < 2) throw httpError(400, 'Priset behöver kosta minst 2 prismarker.');
    if (!Number.isInteger(stock) || stock < 0) throw httpError(400, 'Antalet behöver vara noll eller högre.');
    await query(
      `UPDATE prizes SET name = $2, description = $3, cost = $4, stock = $5, active = $6, sort_order = $7
       WHERE id = $1`,
      [
        prize.id,
        req.body.name === undefined ? prize.name : String(req.body.name).trim(),
        req.body.description === undefined ? prize.description : String(req.body.description),
        cost,
        stock,
        req.body.active === undefined ? prize.active : Boolean(req.body.active),
        req.body.sortOrder === undefined ? prize.sort_order : Number(req.body.sortOrder) || 0,
      ]
    );
    res.json({ ok: true });
  })
);

router.post(
  '/prizes/:id/image',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM prizes WHERE id = $1', [param(req.params.id)]);
    if (!rows[0]) throw httpError(404, 'Priset finns inte.');
    if (!req.file) throw httpError(400, 'Välj en bild.');
    const dest = await saveImage(req.file, env.prizeDir, `${rows[0].id}.jpg`);
    if (rows[0].image_path && rows[0].image_path !== dest) removeFile(rows[0].image_path);
    await query('UPDATE prizes SET image_path = $2 WHERE id = $1', [rows[0].id, dest]);
    res.json({ imageUrl: `/api/public/prize-images/${rows[0].id}` });
  })
);

router.post(
  '/redemptions',
  asyncRoute(async (req, res) => {
    const prizeId = String(req.body.prizeId || '');
    const participantId = String(req.body.participantId || '');
    const quantity = Number(req.body.quantity || 1);
    const force = Boolean(req.body.force);
    const note = String(req.body.note || '').trim().slice(0, 200) || null;
    if (!Number.isInteger(quantity) || quantity < 1) throw httpError(400, 'Antalet behöver vara minst 1.');
    const person = await query('SELECT id FROM participants WHERE id = $1', [participantId]);
    if (!person.rows[0]) throw httpError(404, 'Deltagaren finns inte.');
    await withTransaction(async (client) => {
      const prize = await client.query('SELECT * FROM prizes WHERE id = $1 FOR UPDATE', [prizeId]);
      if (!prize.rows[0]) throw httpError(404, 'Priset finns inte.');
      if (prize.rows[0].stock < quantity) throw httpError(400, 'Det finns inte så många kvar.');
      const balances = await chipBalances(participantId);
      const cost = prize.rows[0].cost * quantity;
      if (!force && balances.prizeChips < cost) {
        throw httpError(
          400,
          `Registrerade prismarker (${balances.prizeChips}) räcker inte till ${cost}. Kryssa i att utlämningen ändå ska sparas om de fysiska markerna stämmer.`
        );
      }
      await client.query('UPDATE prizes SET stock = stock - $2 WHERE id = $1', [prizeId, quantity]);
      await client.query(
        `INSERT INTO prize_redemptions (prize_id, participant_id, quantity, recorded_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [prizeId, participantId, quantity, req.account.id, note]
      );
    });
    res.status(201).json({ ok: true });
  })
);

router.delete(
  '/redemptions/:id',
  asyncRoute(async (req, res) => {
    await withTransaction(async (client) => {
      const { rows } = await client.query('DELETE FROM prize_redemptions WHERE id = $1 RETURNING *', [
        param(req.params.id),
      ]);
      if (!rows[0]) throw httpError(404, 'Utlämningen finns inte.');
      await client.query('UPDATE prizes SET stock = stock + $2 WHERE id = $1', [
        rows[0].prize_id,
        rows[0].quantity,
      ]);
    });
    res.json({ ok: true });
  })
);

router.post(
  '/adjustments',
  asyncRoute(async (req, res) => {
    const participantId = String(req.body.participantId || '');
    const baseDelta = Number(req.body.baseDelta || 0);
    const prizeDelta = Number(req.body.prizeDelta || 0);
    const reason = String(req.body.reason || '').trim();
    if (!reason) throw httpError(400, 'Skriv varför rättningen görs.');
    if (!Number.isInteger(baseDelta) || !Number.isInteger(prizeDelta)) {
      throw httpError(400, 'Markerna behöver vara heltal.');
    }
    const person = await query('SELECT id FROM participants WHERE id = $1', [participantId]);
    if (!person.rows[0]) throw httpError(404, 'Deltagaren finns inte.');
    await query(
      `INSERT INTO chip_adjustments (participant_id, base_delta, prize_delta, reason, recorded_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [participantId, baseDelta, prizeDelta, reason, req.account.id]
    );
    res.status(201).json({ balances: await chipBalances(participantId) });
  })
);

router.get(
  '/staff',
  asyncRoute(async (_req, res) => {
    const accounts = await query(
      `SELECT id, email, role, active, created_at FROM accounts
       WHERE role IN ('admin', 'doorman', 'gamemaster') ORDER BY role, email`
    );
    const links = await query('SELECT account_id, game_key FROM gamemaster_games');
    const games = await query('SELECT key, name FROM games ORDER BY sort_order');
    res.json({
      games: games.rows,
      staff: accounts.rows.map((account) => ({
        id: account.id,
        email: account.email,
        role: account.role,
        active: account.active,
        createdAt: account.created_at,
        gameKeys: links.rows.filter((link) => link.account_id === account.id).map((link) => link.game_key),
      })),
    });
  })
);

router.post(
  '/staff',
  asyncRoute(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = req.body.role === 'doorman' ? 'doorman' : 'gamemaster';
    const gameKeys = Array.isArray(req.body.gameKeys) ? req.body.gameKeys.map(String) : [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Ogiltig e-postadress.');
    if (password.length < 8) throw httpError(400, 'Lösenordet behöver minst 8 tecken.');
    const hash = await bcrypt.hash(password, 10);
    const account = await query(
      `INSERT INTO accounts (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
      [email, hash, role]
    );
    if (role === 'gamemaster') await setGames(account.rows[0].id, gameKeys);
    res.status(201).json({ id: account.rows[0].id });
  })
);

router.patch(
  '/staff/:id',
  asyncRoute(async (req, res) => {
    const { rows } = await query('SELECT * FROM accounts WHERE id = $1', [param(req.params.id)]);
    const account = rows[0];
    if (!account || account.role === 'participant') throw httpError(404, 'Kontot finns inte.');
    if (req.body.active === false && account.role === 'admin') {
      const admins = await query(`SELECT count(*)::int AS n FROM accounts WHERE role = 'admin' AND active`);
      if (admins.rows[0].n <= 1) throw httpError(400, 'Sista administratören kan inte stängas av.');
    }
    if (req.body.active !== undefined) {
      await query('UPDATE accounts SET active = $2 WHERE id = $1', [account.id, Boolean(req.body.active)]);
    }
    if (account.role === 'gamemaster' && Array.isArray(req.body.gameKeys)) {
      await setGames(account.id, req.body.gameKeys.map(String));
    }
    if (req.body.password) {
      const password = String(req.body.password);
      if (password.length < 8) throw httpError(400, 'Lösenordet behöver minst 8 tecken.');
      const hash = await bcrypt.hash(password, 10);
      await query('UPDATE accounts SET password_hash = $2 WHERE id = $1', [account.id, hash]);
    }
    res.json({ ok: true });
  })
);

async function setGames(accountId, gameKeys) {
  const known = await query('SELECT key FROM games');
  const allowed = new Set(known.rows.map((row) => row.key));
  await query('DELETE FROM gamemaster_games WHERE account_id = $1', [accountId]);
  for (const key of gameKeys) {
    if (!allowed.has(key)) continue;
    await query(
      'INSERT INTO gamemaster_games (account_id, game_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [accountId, key]
    );
  }
}

function textOr(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function boolOr(value, fallback) {
  if (value === undefined) return fallback;
  return Boolean(value);
}

export default router;
