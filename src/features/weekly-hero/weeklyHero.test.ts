import { describe, expect, it } from 'vitest';
import type { GameRound, GameSession, TarneebRoundInput } from '../../types';
import { calculateWeeklyCourt } from '../weekly/calculateWeeklyCourt';
import { getLocalWeekBounds } from '../weekly/weekWindow';
import { buildWeeklyHeroLine } from './buildWeeklyHeroLine';
import { calculateWeeklyHeroPlayerStats, selectWeeklyHero, type WeeklyHeroPlayerStats } from './calculateWeeklyHero';

const hero = (profileId: string, heroScore: number, wins: number, heroEvents: number, successRate: number | undefined, catastrophicMistakes: number, completedGames = 3): WeeklyHeroPlayerStats => ({
  profileId, name: profileId, heroScore, completedGames, heroEvents, catastrophicMistakes, successRate, reasons: [], awards: [],
  counters: { wins, losses: 0, contracts: successRate === undefined ? 0 : 4, successfulContracts: successRate === undefined ? 0 : Math.round(successRate / 25), failedContracts: 0, highSuccessfulContracts: 0, kaboots: 0, longestSuccessStreak: 0, tenDiamonds: 0, doubledTens: 0, trixFirst: 0 }
});

function tarneebFixture() {
  const roster = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, profileId: `profile-${id}`, name: id.toUpperCase(), seat }));
  const teams = [{ id: 'x', name: 'X', playerIds: ['a', 'c'] as [string, string] }, { id: 'y', name: 'Y', playerIds: ['b', 'd'] as [string, string] }];
  const games = ['g1', 'g2'].map((id, gameIndex): GameSession => ({ id, gameType: 'tarneeb-61', status: 'completed', players: roster, teams, createdAt: `2026-11-0${7 + gameIndex}T10:30:00+03:00`, updatedAt: `2026-11-0${7 + gameIndex}T12:00:00+03:00`, finishedAt: `2026-11-0${7 + gameIndex}T12:00:00+03:00`, currentRound: 2, scores: { x: 61, y: -7 }, winnerIds: ['x'], rulesSnapshot: { kind: 'tarneeb-61-v2', version: 2, rules: { version: 2, targetScore: 61, minimumBid: 7, maximumBid: 13 } } }));
  const rounds = games.flatMap((game): GameRound[] => {
    const success: TarneebRoundInput = { bidderId: 'a', bidderTeamId: 'x', bid: 10, teamOneTricks: 10 };
    const failure: TarneebRoundInput = { bidderId: 'b', bidderTeamId: 'y', bid: 7, teamOneTricks: 8 };
    return [
      { id: `${game.id}-a`, gameId: game.id, index: 0, type: 'tarneeb', input: success, scoreDelta: { x: 10, y: 3 }, scoreAfter: { x: 10, y: 3 }, createdAt: game.createdAt },
      { id: `${game.id}-b`, gameId: game.id, index: 1, type: 'tarneeb', input: failure, scoreDelta: { x: 8, y: -7 }, scoreAfter: { x: 18, y: -4 }, createdAt: game.createdAt }
    ];
  });
  return { games, rounds };
}

describe('weekly hero', () => {
  it('selects strong wins and contracts over fewer wins with repeated disasters', () => {
    const { games, rounds } = tarneebFixture();
    const stats = calculateWeeklyHeroPlayerStats(games, rounds, getLocalWeekBounds(new Date(2026, 10, 8, 13)));
    expect(selectWeeklyHero(stats)[0].profileId).toBe('profile-a');
    expect(stats.find((item) => item.profileId === 'profile-a')?.counters).toMatchObject({ wins: 2, successfulContracts: 2, highSuccessfulContracts: 2 });
    expect(stats.find((item) => item.profileId === 'profile-b')?.catastrophicMistakes).toBe(2);
  });

  it('requires two completed games even with a perfect record', () => expect(selectWeeklyHero([hero('a', 100, 1, 5, 100, 0, 1)])).toEqual([]));

  it('applies wins, hero events, success rate and fewer catastrophes as tie breakers', () => {
    expect(selectWeeklyHero([hero('a', 30, 3, 2, 75, 0), hero('b', 30, 2, 8, 100, 0)])[0].profileId).toBe('a');
    expect(selectWeeklyHero([hero('a', 30, 3, 5, 75, 2), hero('b', 30, 3, 4, 100, 0)])[0].profileId).toBe('a');
    expect(selectWeeklyHero([hero('a', 30, 3, 5, 75, 2), hero('b', 30, 3, 5, 100, 3)])[0].profileId).toBe('b');
  });

  it('returns shared heroes when every tie breaker remains equal', () => expect(selectWeeklyHero([hero('a', 30, 3, 5, 75, 1), hero('b', 30, 3, 5, 75, 1)]).map((item) => item.profileId)).toEqual(['a', 'b']));

  it('returns hero and donkey verdicts from the same games and week', () => {
    const { games, rounds } = tarneebFixture();
    const court = calculateWeeklyCourt(games, rounds, getLocalWeekBounds(new Date(2026, 10, 8, 13)));
    expect(court.hero.winners[0].profileId).toBe('profile-a');
    expect(court.donkey.winners[0].profileId).toBe('profile-b');
    expect(court.hero.bounds.key).toBe(court.donkey.bounds.key);
  });

  it('keeps the hero summary deterministic across refreshes', () => expect(buildWeeklyHeroLine('2026-11-07T10:00-local', 'p1')).toBe(buildWeeklyHeroLine('2026-11-07T10:00-local', 'p1')));
});
