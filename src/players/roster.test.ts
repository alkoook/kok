import { describe, expect, it } from 'vitest';
import type { GameRound, GameSession } from '../types';
import { playerStats } from './roster';

const players = [{ id: 'a', profileId: 'pa', name: 'دائم', seat: 0 }, { id: 'b', name: 'مؤقت', seat: 1 }, { id: 'c', profileId: 'pc', name: 'شريك', seat: 2 }, { id: 'd', name: 'مؤقت 2', seat: 3 }];
const solo: GameSession = { id: 'solo', gameType: 'trix-fast', status: 'completed', players, trixMode: 'solo', createdAt: '', updatedAt: '', currentRound: 1, scores: { a: -100, b: -100, c: -100, d: -200 }, rulesSnapshot: { kind: 'fast-trix-v4', version: 4 }, firstKingdomOwnerId: 'a', winnerIds: ['a'] };
const soloRound = (score: number): GameRound => ({ id: 'r', gameId: 'solo', index: 0, kingdomIndex: 0, kingdomOwnerId: 'a', type: 'lash', input: { kind: 'lash-solo', scoresByPlayer: { a: score, b: -100, c: -100, d: -300 - score }, oldMan: { eaterPlayerId: 'a', doubled: true } }, scoreDelta: { a: score, b: -100, c: -100, d: -300 - score }, scoreAfter: { a: score, b: -100, c: -100, d: -300 - score }, createdAt: '' });
const partnership: GameSession = { ...solo, id: 'team', trixMode: 'partnership', teams: [{ id: 'x', name: 'دائم وشريك', playerIds: ['a', 'c'] }, { id: 'y', name: 'المؤقتان', playerIds: ['b', 'd'] }], scores: { x: -180, y: -320 }, winnerIds: ['x'] };
const teamRound: GameRound = { ...soloRound(-100), id: 'team-r', gameId: 'team', input: { kind: 'lash-partnership', scoresByTeam: { x: -180, y: -320 }, oldMan: { eaterPlayerId: 'a', doubled: false } }, scoreDelta: { x: -180, y: -320 }, scoreAfter: { x: -180, y: -320 } };

describe('إحصاءات اللاعب المشتقة', () => {
  it('يعكس تعديل الجولة فورًا من البيانات الخام', () => { expect(playerStats('pa', [solo], [soloRound(-100)]).bestLash).toBe(-100); expect(playerStats('pa', [solo], [soloRound(25)]).bestLash).toBe(25); });
  it('حذف المباراة يعني اختفاء الإحصاء من دون عداد مخزن', () => { expect(playerStats('pa', [solo], [soloRound(-100)]).games).toBe(1); expect(playerStats('pa', [], []).games).toBe(0); });
  it('لا ينسب نتيجة لطش الفريق إلى لاعب ولا يتأثر بالمؤقت', () => { const stats = playerStats('pa', [partnership], [teamRound]); expect(stats.bestLash).toBeUndefined(); expect(stats.games).toBe(1); expect(stats.oldMan).toBe(1); expect(playerStats('missing', [partnership], [teamRound]).games).toBe(0); });
});
