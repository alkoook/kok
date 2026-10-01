import { describe, expect, it } from 'vitest';
import type { GamePlayer, GameRound, GameSession } from '../../types';
import { CC_GAME_TOTAL, CC_KINGDOM_TOTAL, lashTotal, ownerForKingdom, trixRankingDelta, validateFastKingdom, validateLashScores } from './scoring';

const players: GamePlayer[] = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, name: id, seat }));
const game: GameSession = { id: 'g', gameType: 'trix-fast', status: 'active', players, createdAt: '', updatedAt: '', currentRound: 0, scores: { a: 0, b: 0, c: 0, d: 0 }, rulesSnapshot: { kind: 'fast-trix-v3', version: 3 }, firstKingdomOwnerId: 'b' };
const round = (id: string, kingdomIndex: number, type: 'lash' | 'trix-ranking', delta: Record<string, number>): GameRound => ({ id, gameId: 'g', index: Number(id.slice(1)), type, kingdomIndex, input: type === 'lash' ? { kind: 'lash', scoresByPlayer: delta, oldMan: { eaterPlayerId: 'a', doubled: false } } : { kind: 'trix-ranking', finishingOrder: ['a', 'b', 'c', 'd'] }, scoreDelta: delta, scoreAfter: delta, createdAt: '' });

describe('Fast Trix وCC', () => {
  it('يقبل لطشًا مجموعه -500 بما فيه قيمة موجبة ويرفض غيره', () => { const valid = { a: 25, b: -200, c: -175, d: -150 }; expect(validateLashScores(valid, players)).toBe(true); expect(lashTotal(valid)).toBe(-500); expect(validateLashScores({ ...valid, d: -125 }, players)).toBe(false); });
  it('يحوّل ترتيب التركس إلى 200 و150 و100 و50 دون تكرار', () => { expect(trixRankingDelta(['d', 'b', 'a', 'c'], players)).toEqual({ d: 200, b: 150, a: 100, c: 50 }); expect(() => trixRankingDelta(['a', 'a', 'b', 'c'], players)).toThrow(); });
  it('يثبت توازن مملكة Fast Trix عند صفر', () => { const lash = { a: -200, b: -150, c: -100, d: -50 }; const trix = { a: 200, b: 150, c: 100, d: 50 }; expect(validateFastKingdom([round('r0', 0, 'lash', lash), round('r1', 0, 'trix-ranking', trix)], 0, 'trix-fast')).toBe(true); });
  it('يثبت CC عند -1000 للمملكة و-4000 للمباراة', () => { const lash = { a: -200, b: -150, c: -100, d: -50 }; const rounds = Array.from({ length: 8 }, (_, index) => round(`r${index}`, Math.floor(index / 2), 'lash', lash)); for (let kingdom = 0; kingdom < 4; kingdom += 1) expect(validateFastKingdom(rounds, kingdom, 'cc')).toBe(true); expect(rounds.reduce((sum, item) => sum + lashTotal(item.scoreDelta), 0)).toBe(CC_GAME_TOTAL); expect(CC_KINGDOM_TOTAL).toBe(-1000); });
  it('يدوّر صاحب المملكة من صاحب البداية', () => expect([0, 1, 2, 3].map((index) => ownerForKingdom(game, index).id)).toEqual(['b', 'c', 'd', 'a']));
});
