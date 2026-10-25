import { describe, expect, it } from 'vitest';
import type { GameRound, GameSession, LikhaRoundInput, TarneebRoundInput } from '../../types';
import { buildWeeklyRoast } from './buildWeeklyRoast';
import { calculateWeeklyPlayerStats, getLocalWeekBounds, selectWeeklyDonkey, type WeeklyPlayerStats } from './calculateWeeklyDonkey';

const player = (profileId: string, donkeyScore: number, losses: number, catastrophicEvents: number, worstEventSeverity: number, completedGames = 3): WeeklyPlayerStats => ({ profileId, name: profileId, donkeyScore, completedGames, catastrophicEvents, worstEventSeverity, reasons: [], counters: { losses, wins: 0, tarneeb61Breaks: 0, brokenSevens: 0, maxBrokenBid: 0, queenSpades: 0, doubledQueens: 0, kingClubs: 0, jackDiamonds: 0, hearts: 0, tenDiamonds: 0, oldMan: 0, doubledOldMan: 0, tarneeb41Breaks: 0, trixLast: 0 } });

describe('weekly donkey', () => {
  it('selects the player with repeated failures and a doubled queen over wins', () => expect(selectWeeklyDonkey([player('a', 4, 1, 0, 5), player('b', 55, 2, 4, 16)])[0].profileId).toBe('b'));
  it('makes three broken 7s, two losses and a doubled queen beat several wins', () => {
    const roster = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, profileId: `profile-${id}`, name: id.toUpperCase(), seat })); const teams = [{ id: 'x', name: 'X', playerIds: ['a', 'c'] as [string, string] }, { id: 'y', name: 'Y', playerIds: ['b', 'd'] as [string, string] }];
    const game = (id: string): GameSession => ({ id, gameType: 'tarneeb-61', status: 'completed', players: roster, teams, createdAt: '2026-10-20T10:00:00+03:00', updatedAt: '2026-10-20T11:00:00+03:00', finishedAt: '2026-10-20T11:00:00+03:00', currentRound: 1, scores: { x: 61, y: -7 }, winnerIds: ['x'], rulesSnapshot: { kind: 'tarneeb-61-v2', version: 2, rules: { version: 2, targetScore: 61, minimumBid: 7, maximumBid: 13 } } });
    const likha: GameSession = { id: 'g3', gameType: 'likha', status: 'completed', players: roster, createdAt: '2026-10-21T10:00:00+03:00', updatedAt: '2026-10-21T11:00:00+03:00', finishedAt: '2026-10-21T11:00:00+03:00', currentRound: 1, scores: { a: 10, b: -26, c: -14, d: -11 }, winnerIds: ['a'], rulesSnapshot: { kind: 'likha-v1', version: 1, rules: { version: 1, lossLimit: 20 } } };
    const games = [game('g1'), game('g2'), likha]; const broken = (gameId: string, index: number): GameRound => { const input: TarneebRoundInput = { bidderId: 'b', bidderTeamId: 'y', bid: 7, teamOneTricks: 8 }; return { id: `${gameId}-${index}`, gameId, index, type: 'tarneeb', input, scoreDelta: { x: 8, y: -7 }, scoreAfter: { x: 8, y: -7 }, createdAt: '2026-10-20T10:30:00+03:00' }; };
    const likhaInput: LikhaRoundInput = { players: roster.map((entry, index) => ({ playerId: entry.id, heartsCount: index === 3 ? 13 : 0 })), specialCards: { jackDiamonds: { capturedBy: 'd', doubled: false }, queenSpades: { capturedBy: 'b', doubled: true }, kingClubs: { capturedBy: 'c', doubled: false }, tenDiamonds: { capturedBy: 'a', doubled: false } } };
    const likhaRound: GameRound = { id: 'g3-0', gameId: 'g3', index: 0, type: 'likha', input: likhaInput, scoreDelta: { a: 10, b: -26, c: -14, d: -24 }, scoreAfter: { a: 10, b: -26, c: -14, d: -24 }, createdAt: '2026-10-21T10:30:00+03:00' };
    const stats = calculateWeeklyPlayerStats(games, [broken('g1', 0), broken('g1', 1), broken('g2', 0), likhaRound], getLocalWeekBounds(new Date(2026, 9, 22)));
    expect(selectWeeklyDonkey(stats)[0].profileId).toBe('profile-b'); expect(stats.find((item) => item.profileId === 'profile-b')?.counters).toMatchObject({ brokenSevens: 3, doubledQueens: 1 });
  });
  it('applies losses, catastrophes and severity tie breakers', () => { expect(selectWeeklyDonkey([player('a', 20, 2, 1, 14), player('b', 20, 3, 0, 8)])[0].profileId).toBe('b'); expect(selectWeeklyDonkey([player('a', 20, 3, 2, 14), player('b', 20, 3, 1, 16)])[0].profileId).toBe('a'); });
  it('returns a real shared tie and never chooses randomly', () => expect(selectWeeklyDonkey([player('a', 20, 3, 2, 14), player('b', 20, 3, 2, 14)]).map((item) => item.profileId)).toEqual(['a', 'b']));
  it('requires two completed games', () => expect(selectWeeklyDonkey([player('a', 100, 1, 1, 16, 1)])).toEqual([]));
  it('attributes partnership losses to both partners but the queen only to its eater', () => {
    const roster = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, profileId: `profile-${id}`, name: id.toUpperCase(), seat }));
    const teams = [{ id: 'ab', name: 'A+B', playerIds: ['a', 'b'] as [string, string] }, { id: 'cd', name: 'C+D', playerIds: ['c', 'd'] as [string, string] }];
    const input: LikhaRoundInput = { players: roster.map((entry, index) => ({ playerId: entry.id, heartsCount: index === 0 ? 13 : 0 })), specialCards: { jackDiamonds: { capturedBy: 'b', doubled: false }, queenSpades: { capturedBy: 'a', doubled: true }, kingClubs: { capturedBy: 'c', doubled: false }, tenDiamonds: { capturedBy: 'd', doubled: false } } };
    const games = ['p1', 'p2'].map((id): GameSession => ({ id, gameType: 'likha', likhaMode: 'partnership', status: 'completed', players: roster, teams, createdAt: '2026-10-20T10:00:00+03:00', updatedAt: '2026-10-20T11:00:00+03:00', finishedAt: '2026-10-20T11:00:00+03:00', currentRound: 1, scores: { a: -39, b: -11, c: -14, d: 10 }, winnerIds: ['cd'], rulesSnapshot: { kind: 'likha-v1', version: 1, rules: { version: 1, lossLimit: 40 } } }));
    const rounds = games.map((game): GameRound => ({ id: `${game.id}-r`, gameId: game.id, index: 0, type: 'likha', input, scoreDelta: game.scores, scoreAfter: game.scores, createdAt: '2026-10-20T10:30:00+03:00' }));
    const stats = calculateWeeklyPlayerStats(games, rounds, getLocalWeekBounds(new Date(2026, 9, 22)));
    expect(stats.find((item) => item.profileId === 'profile-a')?.counters).toMatchObject({ losses: 2, doubledQueens: 2 });
    expect(stats.find((item) => item.profileId === 'profile-b')?.counters).toMatchObject({ losses: 2, doubledQueens: 0 });
    expect(stats.find((item) => item.profileId === 'profile-c')?.counters.wins).toBe(2);
  });
  it('uses Monday through next Monday in local calendar time', () => { const sunday = getLocalWeekBounds(new Date(2026, 9, 25, 23, 59)); const monday = getLocalWeekBounds(new Date(2026, 9, 26, 0, 0)); expect(sunday.key).toBe('2026-10-19'); expect(monday.key).toBe('2026-10-26'); });
  it('builds the same roast from the same week and player', () => expect(buildWeeklyRoast('2026-10-19', 'p1')).toBe(buildWeeklyRoast('2026-10-19', 'p1')));
  it('keeps the no-data input safe', () => expect(selectWeeklyDonkey([])).toEqual([]));
});
