/**
 * Poäng för en deltagare.
 * Identitet: rätt +1, fel −1, tom gissning räknas inte.
 * Vampyr: explicit rätt +1, explicit fel −1, obesvarat räknas inte.
 */
export function scoreGuesser({ identityGuesses, vampireGuesses, vampireIds }) {
  const vampires = vampireIds instanceof Set ? vampireIds : new Set(vampireIds);
  let identityPoints = 0;
  let identityCorrect = 0;
  let identityWrong = 0;
  let lastGuessAt = null;

  for (const guess of identityGuesses) {
    lastGuessAt = later(lastGuessAt, guess.updatedAt);
    if (guess.photoId === guess.guessedId) {
      identityPoints += 1;
      identityCorrect += 1;
    } else {
      identityPoints -= 1;
      identityWrong += 1;
    }
  }

  let vampirePoints = 0;
  let vampireCorrect = 0;
  let vampireWrong = 0;
  for (const guess of vampireGuesses) {
    lastGuessAt = later(lastGuessAt, guess.updatedAt);
    const actual = vampires.has(guess.subjectId);
    if (Boolean(guess.suspects) === actual) {
      vampirePoints += 1;
      vampireCorrect += 1;
    } else {
      vampirePoints -= 1;
      vampireWrong += 1;
    }
  }

  return {
    identityPoints,
    vampirePoints,
    total: identityPoints + vampirePoints,
    identityCorrect,
    identityWrong,
    vampireCorrect,
    vampireWrong,
    lastGuessAt,
  };
}

function later(current, next) {
  if (!next) return current;
  if (!current) return next;
  return new Date(next) > new Date(current) ? next : current;
}

/**
 * participants: { id, name, isVampire }
 * identityByGuesser: Map id -> [{ photoId, guessedId, updatedAt }]
 * vampireByGuesser: Map id -> [{ subjectId, suspects, updatedAt }]
 * vampireIds: iterable of vampire participant ids (facit)
 */
export function buildLeaderboard({ participants, identityByGuesser, vampireByGuesser, vampireIds, tieBreak }) {
  const rows = participants.map((participant) => {
    const score = scoreGuesser({
      identityGuesses: identityByGuesser.get(participant.id) || [],
      vampireGuesses: vampireByGuesser.get(participant.id) || [],
      vampireIds,
    });
    return {
      id: participant.id,
      name: participant.name,
      isVampire: Boolean(participant.isVampire),
      ...score,
    };
  });

  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'sv'));
  return annotateWinners(rows, tieBreak);
}

export function annotateWinners(rows, tieBreak) {
  const eligible = rows.filter((row) => !row.isVampire);
  const max = eligible.reduce((highest, row) => Math.max(highest, row.total), Number.NEGATIVE_INFINITY);
  const leaders = Number.isFinite(max) ? eligible.filter((row) => row.total === max) : [];
  const tied = leaders.length > 1;

  let winnerIds = new Set(leaders.map((row) => row.id));
  if (tied && tieBreak === 'earliest') {
    const stamped = leaders.filter((row) => row.lastGuessAt);
    if (stamped.length) {
      stamped.sort(
        (a, b) => new Date(a.lastGuessAt) - new Date(b.lastGuessAt) || a.name.localeCompare(b.name, 'sv')
      );
      winnerIds = new Set([stamped[0].id]);
    }
  }
  if (tied && tieBreak === 'manual') {
    winnerIds = new Set();
  }

  return rows.map((row) => ({
    ...row,
    isWinner: winnerIds.has(row.id),
    tiedForLead: leaders.some((leader) => leader.id === row.id) && tied,
  }));
}

/** Bonus vid förvandling. Null betyder att ingen bonus ska ges. */
export function vampireBonusDecision({ alreadyGranted, isFirstSelection, firstGetsBonus }) {
  if (alreadyGranted) return null;
  if (isFirstSelection && !firstGetsBonus) return null;
  return { baseChips: 20, prizeChip: true };
}
