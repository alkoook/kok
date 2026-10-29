import { describe, expect, it } from 'vitest';
import type { GameSession } from '../../types';
import { getLocalWeekBounds, isCompletedGameInWeek, shiftLocalWeek } from './weekWindow';

const completedGame = (id: string, finishedAt: string, updatedAt = finishedAt): GameSession => ({
  id, gameType: 'likha', status: 'completed', players: [], createdAt: finishedAt, updatedAt, finishedAt,
  currentRound: 0, scores: {}, winnerIds: [], rulesSnapshot: { kind: 'likha-v1', version: 1, rules: { version: 1, lossLimit: 210 } }
});

describe('KOK weekly window', () => {
  it.each([
    ['Friday 23:00', new Date(2026, 10, 6, 23, 0), '2026-10-31T10:00-local'],
    ['Saturday 09:59:59', new Date(2026, 10, 7, 9, 59, 59), '2026-10-31T10:00-local'],
    ['Saturday 10:00:00', new Date(2026, 10, 7, 10, 0, 0), '2026-11-07T10:00-local'],
    ['Saturday 10:00:01', new Date(2026, 10, 7, 10, 0, 1), '2026-11-07T10:00-local'],
    ['Sunday', new Date(2026, 10, 8, 12, 0), '2026-11-07T10:00-local'],
    ['next Saturday 09:59', new Date(2026, 10, 14, 9, 59), '2026-11-07T10:00-local'],
    ['next Saturday 10:00', new Date(2026, 10, 14, 10, 0), '2026-11-14T10:00-local']
  ])('%s resolves to the correct week', (_label, reference, key) => expect(getLocalWeekBounds(reference).key).toBe(key));

  it('keeps both calendar boundaries at local 10:00', () => {
    const bounds = getLocalWeekBounds(new Date(2026, 2, 29, 12, 0));
    expect(bounds.start.getHours()).toBe(10);
    expect(bounds.endExclusive.getHours()).toBe(10);
    expect(bounds.start.getDay()).toBe(6);
    expect(bounds.endExclusive.getDay()).toBe(6);
  });

  it('uses finishedAt rather than createdAt or updatedAt at the exact boundary', () => {
    const current = getLocalWeekBounds(new Date(2026, 10, 7, 12));
    const oldGame = completedGame('old', new Date(2026, 10, 7, 9, 59, 59).toISOString(), new Date(2026, 10, 7, 11).toISOString());
    const newGame = completedGame('new', new Date(2026, 10, 7, 10, 0, 0).toISOString(), new Date(2026, 10, 6, 11).toISOString());
    expect(isCompletedGameInWeek(oldGame, current)).toBe(false);
    expect(isCompletedGameInWeek(newGame, current)).toBe(true);
  });

  it('keeps previous-week games out of the next week and preserves navigation', () => {
    const weekB = getLocalWeekBounds(new Date(2026, 10, 7, 12));
    const weekA = shiftLocalWeek(weekB, -1);
    const gameA = completedGame('a', new Date(2026, 10, 6, 23).toISOString());
    expect(isCompletedGameInWeek(gameA, weekA)).toBe(true);
    expect(isCompletedGameInWeek(gameA, weekB)).toBe(false);
  });
});
