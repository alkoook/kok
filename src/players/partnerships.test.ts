import { describe, expect, it } from 'vitest';
import type { GameRound, GameSession } from '../types';
import { calculateFastPartnership, compareFastPartnerships } from './partnerships';

const players = [{ id: 'a', profileId: 'pa', name: 'أحمد', seat: 0 }, { id: 'b', profileId: 'pb', name: 'عمر', seat: 1 }, { id: 'c', profileId: 'pc', name: 'علي', seat: 2 }, { id: 'd', profileId: 'pd', name: 'زياد', seat: 3 }];
const teams = [{ id: 'x', name: 'أحمد وعلي', playerIds: ['a', 'c'] as [string, string] }, { id: 'y', name: 'عمر وزياد', playerIds: ['b', 'd'] as [string, string] }];
const game: GameSession = { id: 'g', gameType: 'cc', status: 'completed', players, teams, trixMode: 'partnership', createdAt: '', updatedAt: '', currentRound: 8, scores: { x: -1750, y: -2250 }, rulesSnapshot: { kind: 'cc-v2', version: 2 }, firstKingdomOwnerId: 'a', winnerIds: ['x'] };
const rounds: GameRound[] = Array.from({ length: 8 }, (_, index) => ({ id: `r${index}`, gameId: 'g', index, kingdomIndex: Math.floor(index / 2), type: 'lash', input: { kind: 'lash-partnership', scoresByTeam: { x: -180, y: -320 }, oldMan: { eaterPlayerId: index % 2 ? 'a' : 'b', doubled: index === 1 } }, scoreDelta: { x: -180, y: -320 }, scoreAfter: { x: -180 * (index + 1), y: -320 * (index + 1) }, createdAt: '' }));

describe('إحصاءات الشراكات', () => {
  it('يشتق نتيجة الفريق ولا يخترع لطشًا فرديًا', () => { const stats = calculateFastPartnership(['pa', 'pc'], [game], rounds)!; expect(stats).toMatchObject({ games: 1, wins: 1, ccGames: 1, ccWins: 1, bestFinalScore: -1750, worstFinalScore: -1750, oldMan: 4, doubledOldMan: 1 }); expect(stats.bestFastKingdom).toBeUndefined(); expect(stats.bestCcKingdom).toBe(-360); });
  it('يقارن شراكتين بالمواجهة الحقيقية والأعلى عدديًا يفوز', () => expect(compareFastPartnerships(['pa', 'pc'], ['pb', 'pd'], [game])).toMatchObject({ meetings: 1, leftWins: 1, leftLosses: 0, rightWins: 0, rightLosses: 1, ties: 0, averageMargin: 500, fastTrixGames: 0, ccGames: 1, ccLeftWins: 1, ccRightWins: 0 }));
});
