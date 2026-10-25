import { describe, expect, it } from 'vitest';
import { aggregateLikhaTeamScores, calculateLikhaRound, calculateLikhaTeamRound, calculateLikhaTotals, isLikhaGameFinished, isLikhaPartnershipFinished, rankLikhaPlayers, validateLikhaRound } from './engine';
import type { LikhaRoundInput } from './types';

const ids = ['a', 'b', 'c', 'd'];
const teams = [{ id: 'team-a', name: 'A + B', playerIds: ['a', 'b'] as [string, string] }, { id: 'team-b', name: 'C + D', playerIds: ['c', 'd'] as [string, string] }];
const round = (hearts = [13, 0, 0, 0]): LikhaRoundInput => ({
  players: ids.map((playerId, index) => ({ playerId, heartsCount: hearts[index] })),
  specialCards: {
    jackDiamonds: { capturedBy: 'b', doubled: false }, queenSpades: { capturedBy: 'b', doubled: false },
    kingClubs: { capturedBy: 'c', doubled: false }, tenDiamonds: { capturedBy: 'd', doubled: false }
  }
});

describe('Likha engine', () => {
  it('calculates every base card once', () => expect(calculateLikhaRound(round(), ids)).toEqual({ a: -13, b: -24, c: -14, d: 10 }));
  it('doubles special cards but never hearts', () => {
    const input = round(); Object.values(input.specialCards).forEach((card) => { card.doubled = true; });
    expect(calculateLikhaRound(input, ids)).toEqual({ a: -13, b: -48, c: -28, d: 20 });
  });
  it('calculates the combined -19 example', () => {
    const input = round([3, 4, 3, 3]); input.specialCards.queenSpades = { capturedBy: 'a', doubled: true }; input.specialCards.tenDiamonds = { capturedBy: 'a', doubled: false };
    expect(calculateLikhaRound(input, ids).a).toBe(-19);
  });
  it.each([[12, false], [14, false], [13, true]])('validates a hearts total of %i', (total, valid) => expect(validateLikhaRound(round([total, 0, 0, 0]), ids).valid).toBe(valid));
  it('rejects a missing special-card owner', () => { const input = round(); input.specialCards.queenSpades.capturedBy = ''; expect(validateLikhaRound(input, ids).valid).toBe(false); });
  it('recalculates cumulative totals from round inputs', () => expect(calculateLikhaTotals(ids, [round(), round()])).toEqual({ a: -26, b: -48, c: -28, d: 20 }));
  it.each([[-209, false], [-210, true], [-226, true]])('applies the default loss limit to %i', (score, finished) => expect(isLikhaGameFinished({ a: score }, 210)).toBe(finished));
  it('supports a custom 300 limit', () => { expect(isLikhaGameFinished({ a: -299 }, 300)).toBe(false); expect(isLikhaGameFinished({ a: -300 }, 300)).toBe(true); });
  it('aggregates the official partnership round while retaining player attribution', () => {
    const playerDelta = { a: -13, b: 10, c: -14, d: -6 };
    expect(calculateLikhaTeamRound(playerDelta, teams)).toEqual({ 'team-a': -3, 'team-b': -20 });
  });
  it('derives cumulative partnership totals and ends on the team limit', () => {
    expect(aggregateLikhaTeamScores({ a: -100, b: -109, c: -80, d: -120 }, teams)).toEqual({ 'team-a': -209, 'team-b': -200 });
    expect(isLikhaPartnershipFinished({ a: -100, b: -109, c: -80, d: -120 }, teams, 210)).toBe(false);
    expect(isLikhaPartnershipFinished({ a: -101, b: -109, c: -80, d: -120 }, teams, 210)).toBe(true);
    expect(isLikhaPartnershipFinished({ a: -150, b: -150, c: -80, d: -120 }, teams, 300)).toBe(true);
  });
  it('ranks highest score first and preserves real ties', () => {
    const ranked = rankLikhaPlayers({ a: -80, b: -110, c: -210, d: -140 }); expect(ranked.map((item) => item.playerId)).toEqual(['a', 'b', 'd', 'c']); expect(ranked[0].winner).toBe(true);
    expect(rankLikhaPlayers({ a: -80, b: -80, c: -100, d: -120 }).filter((item) => item.winner).map((item) => item.playerId)).toEqual(['a', 'b']);
  });
});
