import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GameSession, TarneebRoundInput } from '../types';
import { uid } from '../utils';
import { addRound, createGame, db, deleteGame, initializeDatabase, undoLastRound } from './database';

const players = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, name: id, seat })); const teams = [{ id: 'x', name: 'X', playerIds: ['a', 'c'] as [string, string] }, { id: 'y', name: 'Y', playerIds: ['b', 'd'] as [string, string] }];
const tarneeb = (target: number): GameSession => ({ id: uid(), gameType: 'tarneeb-61', status: 'active', players, teams, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), currentRound: 0, scores: { x: 0, y: 0 }, rulesSnapshot: { kind: 'tarneeb-61-v2', version: 2, rules: { version: 2, targetScore: target, minimumBid: 7, maximumBid: 13 } } });

describe('تكامل Dexie', () => {
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDatabase(); }); afterEach(async () => db.close());
  it.each([31, 41, 51, 61, 75])('يحفظ هدف الطرنيب %i داخل المباراة', async (target) => { const game = tarneeb(target); await createGame(game); const saved = await db.games.get(game.id); expect(saved?.rulesSnapshot.kind).toBe('tarneeb-61-v2'); if (saved?.rulesSnapshot.kind === 'tarneeb-61-v2') expect(saved.rulesSnapshot.rules.targetScore).toBe(target); });
  it('ينهي هدف 31 ويبقي 61 نشطًا لنفس الجولات', async () => { for (const target of [31, 61]) { const game = tarneeb(target); await createGame(game); for (let index = 0; index < 2; index += 1) { const input: TarneebRoundInput = { bidderId: 'a', bidderTeamId: 'x', bid: 13, teamOneTricks: 13 }; await addRound({ gameId: game.id, type: 'tarneeb', input, scoreDelta: {} }); } expect((await db.games.get(game.id))?.status).toBe(target === 31 ? 'completed' : 'active'); } });
  it('يحفظ لطشًا وبيانات الختيار ثم يتراجع عنه', async () => { const game: GameSession = { ...tarneeb(61), gameType: 'cc', teams, scores: { a: 0, b: 0, c: 0, d: 0 }, rulesSnapshot: { kind: 'cc-v1', version: 1 }, firstKingdomOwnerId: 'a', trixMode: 'partnership' }; await createGame(game); await addRound({ gameId: game.id, type: 'lash', kingdomIndex: 0, kingdomOwnerId: 'a', input: { kind: 'lash', scoresByPlayer: { a: -200, b: -150, c: -100, d: -50 }, oldMan: { eaterPlayerId: 'a', doubled: true } }, scoreDelta: {} }); expect((await db.rounds.where('gameId').equals(game.id).first())?.input).toMatchObject({ oldMan: { eaterPlayerId: 'a', doubled: true } }); await undoLastRound(game.id); expect(await db.rounds.where('gameId').equals(game.id).count()).toBe(0); });
  it('حذف المباراة لا يترك عداد gamesPlayed هشًا', async () => { const game = tarneeb(31); game.players[0].profileId = 'profile'; await db.players.add({ id: 'profile', name: 'a', createdAt: '', updatedAt: '' }); await createGame(game); await deleteGame(game.id); expect((await db.players.get('profile'))?.gamesPlayed).toBeUndefined(); });
});
