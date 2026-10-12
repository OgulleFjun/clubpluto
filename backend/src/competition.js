import { query } from './db.js';
import { buildLeaderboard } from './scoring.js';

export async function getSettings() {
  const { rows } = await query('SELECT * FROM event_settings WHERE id = 1');
  if (!rows[0]) throw new Error('Evenemangsinställningar saknas. Kör migrate.');
  return rows[0];
}

export function presentSettings(row, { includeSecrets = false } = {}) {
  return {
    clubName: row.club_name,
    tagline: row.tagline,
    eventStartsAt: row.event_starts_at,
    location: row.location,
    publicIntro: row.public_intro,
    rulesText: row.rules_text,
    registrationOpen: row.registration_open,
    identityOpen: row.identity_open,
    vampireConversionsOpen: row.vampire_conversions_open,
    resultsRevealed: row.results_revealed,
    useAliases: row.use_aliases,
    firstVampireGetsBonus: row.first_vampire_gets_bonus,
    tieBreak: row.tie_break,
    competitionClosedAt: row.competition_closed_at,
    doorPasswordSet: includeSecrets ? Boolean(row.door_password_hash) : undefined,
  };
}

const chipSelect = `
  p.base_chips + COALESCE((
    SELECT SUM(base_delta) FROM chip_adjustments a WHERE a.participant_id = p.id
  ), 0) AS base_balance,
  (
    CASE WHEN p.vampire_bonus_granted THEN 1 ELSE 0 END
    + COALESCE((
      SELECT SUM(prize_chips) FROM game_results r
      WHERE r.participant_id = p.id AND NOT r.voided
    ), 0)
    + COALESCE((
      SELECT SUM(prize_delta) FROM chip_adjustments a WHERE a.participant_id = p.id
    ), 0)
    - COALESCE((
      SELECT SUM(pr.quantity * z.cost)
      FROM prize_redemptions pr
      JOIN prizes z ON z.id = pr.prize_id
      WHERE pr.participant_id = p.id
    ), 0)
  ) AS prize_balance
`;

export async function chipBalances(participantId) {
  const { rows } = await query(
    `SELECT ${chipSelect} FROM participants p WHERE p.id = $1`,
    [participantId]
  );
  const row = rows[0];
  return {
    baseChips: Number(row?.base_balance || 0),
    prizeChips: Number(row?.prize_balance || 0),
  };
}

export async function loadGuessMaps() {
  const identity = await query(
    `SELECT guesser_id, photo_participant_id, guessed_participant_id, updated_at
     FROM identity_guesses`
  );
  const vampires = await query(
    `SELECT guesser_id, subject_id, suspects, updated_at FROM vampire_guesses`
  );
  const identityByGuesser = new Map();
  for (const row of identity.rows) {
    const list = identityByGuesser.get(row.guesser_id) || [];
    list.push({
      photoId: row.photo_participant_id,
      guessedId: row.guessed_participant_id,
      updatedAt: row.updated_at,
    });
    identityByGuesser.set(row.guesser_id, list);
  }
  const vampireByGuesser = new Map();
  for (const row of vampires.rows) {
    const list = vampireByGuesser.get(row.guesser_id) || [];
    list.push({
      subjectId: row.subject_id,
      suspects: row.suspects,
      updatedAt: row.updated_at,
    });
    vampireByGuesser.set(row.guesser_id, list);
  }
  return { identityByGuesser, vampireByGuesser, identityRows: identity.rows, vampireRows: vampires.rows };
}

export async function currentLeaderboard() {
  const settings = await getSettings();
  const participants = await query(
    `SELECT id, name, alias, is_vampire, photo_token, name_token
     FROM participants ORDER BY name`
  );
  const maps = await loadGuessMaps();
  const vampireIds = participants.rows.filter((row) => row.is_vampire).map((row) => row.id);
  const board = buildLeaderboard({
    participants: participants.rows.map((row) => ({
      id: row.id,
      name: row.name,
      isVampire: row.is_vampire,
    })),
    identityByGuesser: maps.identityByGuesser,
    vampireByGuesser: maps.vampireByGuesser,
    vampireIds,
    tieBreak: settings.tie_break,
  });
  return { settings, participants: participants.rows, maps, vampireIds, board };
}

export async function saveSnapshots(client, board) {
  await client.query('DELETE FROM score_snapshots');
  for (const row of board) {
    await client.query(
      `INSERT INTO score_snapshots (
        participant_id, identity_points, vampire_points, total_points,
        identity_correct, identity_wrong, vampire_correct, vampire_wrong,
        is_vampire, is_winner, tied_for_lead, last_guess_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        row.id,
        row.identityPoints,
        row.vampirePoints,
        row.total,
        row.identityCorrect,
        row.identityWrong,
        row.vampireCorrect,
        row.vampireWrong,
        row.isVampire,
        row.isWinner,
        row.tiedForLead,
        row.lastGuessAt,
      ]
    );
  }
}

export function presentScore(row) {
  if (!row) return null;
  return {
    identityPoints: row.identity_points ?? row.identityPoints,
    vampirePoints: row.vampire_points ?? row.vampirePoints,
    total: row.total_points ?? row.total,
    identityCorrect: row.identity_correct ?? row.identityCorrect,
    identityWrong: row.identity_wrong ?? row.identityWrong,
    vampireCorrect: row.vampire_correct ?? row.vampireCorrect,
    vampireWrong: row.vampire_wrong ?? row.vampireWrong,
    isVampire: row.is_vampire ?? row.isVampire,
    isWinner: row.is_winner ?? row.isWinner,
    tiedForLead: row.tied_for_lead ?? row.tiedForLead,
  };
}
