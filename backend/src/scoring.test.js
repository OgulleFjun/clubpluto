import { describe, expect, it } from 'vitest';
import { annotateWinners, buildLeaderboard, conversionCredit, scoreGuesser, vampireBonusDecision } from './scoring.js';

describe('scoreGuesser', () => {
  it('ger plus för rätt och minus för fel, och hoppar över tomma gissningar', () => {
    const score = scoreGuesser({
      identityGuesses: [
        { photoId: 'a', guessedId: 'a' },
        { photoId: 'b', guessedId: 'c' },
      ],
      vampireGuesses: [
        { subjectId: 'a', suspects: true },
        { subjectId: 'b', suspects: false },
      ],
      vampireIds: ['a'],
    });
    expect(score.identityPoints).toBe(0);
    expect(score.identityCorrect).toBe(1);
    expect(score.identityWrong).toBe(1);
    expect(score.vampirePoints).toBe(2);
    expect(score.total).toBe(2);
  });

  it('straffar en felaktig vampyranklagelse', () => {
    const score = scoreGuesser({
      identityGuesses: [],
      vampireGuesses: [{ subjectId: 'b', suspects: true }],
      vampireIds: [],
    });
    expect(score.vampirePoints).toBe(-1);
    expect(score.vampireWrong).toBe(1);
  });
});

describe('överlevnad', () => {
  const people = [
    { id: 'human-high', name: 'Ada', isVampire: false },
    { id: 'vampire-higher', name: 'Beda', isVampire: true },
    { id: 'human-low', name: 'Cilla', isVampire: false },
  ];

  it('diskvalificerar vampyrer även när de har högst poäng', () => {
    const board = buildLeaderboard({
      participants: people,
      identityByGuesser: new Map([
        ['human-high', [{ photoId: 'a', guessedId: 'a' }]],
        ['vampire-higher', [
          { photoId: 'a', guessedId: 'a' },
          { photoId: 'b', guessedId: 'b' },
        ]],
        ['human-low', []],
      ]),
      vampireByGuesser: new Map(),
      vampireIds: ['vampire-higher'],
      tieBreak: 'shared',
    });
    expect(board.find((row) => row.id === 'human-high').isWinner).toBe(true);
    expect(board.find((row) => row.id === 'vampire-higher').isWinner).toBe(false);
  });

  it('delar priset vid lika poäng', () => {
    const rows = annotateWinners(
      [
        { id: 'a', name: 'Ada', isVampire: false, total: 3, lastGuessAt: '2026-11-01T20:00:00Z' },
        { id: 'b', name: 'Bo', isVampire: false, total: 3, lastGuessAt: '2026-11-01T19:00:00Z' },
        { id: 'c', name: 'Cilla', isVampire: true, total: 9, lastGuessAt: null },
      ],
      'shared'
    );
    expect(rows.filter((row) => row.isWinner).map((row) => row.id).sort()).toEqual(['a', 'b']);
  });

  it('tar den tidigaste gissningen när det är inställt', () => {
    const rows = annotateWinners(
      [
        { id: 'a', name: 'Ada', isVampire: false, total: 3, lastGuessAt: '2026-11-01T20:00:00Z' },
        { id: 'b', name: 'Bo', isVampire: false, total: 3, lastGuessAt: '2026-11-01T19:00:00Z' },
      ],
      'earliest'
    );
    expect(rows.find((row) => row.isWinner).id).toBe('b');
  });

  it('låter arrangören välja vid manuell särskiljning', () => {
    const rows = annotateWinners(
      [
        { id: 'a', name: 'Ada', isVampire: false, total: 3, lastGuessAt: null },
        { id: 'b', name: 'Bo', isVampire: false, total: 3, lastGuessAt: null },
      ],
      'manual'
    );
    expect(rows.every((row) => !row.isWinner)).toBe(true);
    expect(rows.every((row) => row.tiedForLead)).toBe(true);
  });
});

describe('förvandlingsmark', () => {
  it('ger en blodspeng och stoppar vid två', () => {
    expect(conversionCredit({
      newbieIsVampire: true, sireIsVampire: true, alreadyPaid: false, sireChips: 1,
    }).nextChips).toBe(2);
    expect(conversionCredit({
      newbieIsVampire: true, sireIsVampire: true, alreadyPaid: false, sireChips: 2,
    }).ok).toBe(false);
    expect(conversionCredit({
      newbieIsVampire: true, sireIsVampire: true, alreadyPaid: true, sireChips: 0,
    }).ok).toBe(false);
  });
});

describe('vampyrbonus', () => {
  it('ges en gång och kan hoppas över för Den Förste', () => {
    expect(vampireBonusDecision({ alreadyGranted: false, isFirstSelection: false, firstGetsBonus: false })).toEqual({
      baseChips: 20,
      prizeChip: true,
    });
    expect(vampireBonusDecision({ alreadyGranted: true, isFirstSelection: false, firstGetsBonus: true })).toBeNull();
    expect(vampireBonusDecision({ alreadyGranted: false, isFirstSelection: true, firstGetsBonus: false })).toBeNull();
    expect(vampireBonusDecision({ alreadyGranted: false, isFirstSelection: true, firstGetsBonus: true })).toEqual({
      baseChips: 20,
      prizeChip: true,
    });
  });
});
