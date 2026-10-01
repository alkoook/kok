import { describe, expect, it } from 'vitest';
import type { GamePlayer, GameRound, GameSession } from '../../types';
import { CC_GAME_TOTAL, CC_KINGDOM_TOTAL, createPartnershipLashInput, createSoloLashInput, deriveFastRoundDelta, lashTotal, ownerForKingdom, trixRankingDelta, validateFastKingdom, validateLashInput, validateLashScores } from './scoring';

const players: GamePlayer[] = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, name: id, seat }));
const teams = [{ id: 'x', name: 'A + C', playerIds: ['a', 'c'] as [string, string] }, { id: 'y', name: 'B + D', playerIds: ['b', 'd'] as [string, string] }];
const partnershipGame: GameSession = { id: 'g', gameType: 'trix-fast', status: 'active', players, teams, trixMode: 'partnership', createdAt: '', updatedAt: '', currentRound: 0, scores: { x: 0, y: 0 }, rulesSnapshot: { kind: 'fast-trix-v4', version: 4 }, firstKingdomOwnerId: 'b' };
const soloGame: GameSession = { ...partnershipGame, id: 'solo', teams: undefined, trixMode: 'solo', scores: { a: 0, b: 0, c: 0, d: 0 } };
const round = (id: string, kingdomIndex: number, type: 'lash' | 'trix-ranking', delta: Record<string, number>): GameRound => ({ id, gameId: 'g', index: Number(id.slice(1)), type, kingdomIndex, input: type === 'lash' ? createPartnershipLashInput(delta, { eaterPlayerId: 'a', doubled: false }) : { kind: 'trix-ranking', finishingOrder: ['a', 'b', 'c', 'd'] }, scoreDelta: delta, scoreAfter: delta, createdAt: '' });

describe('Fast Trix وCC', () => {
  it('يميز مصدر لطش الشراكة عن اليهودية بلا تقسيم وهمي', () => {
    const teamInput = createPartnershipLashInput({ x: -180, y: -320 }, { eaterPlayerId: 'a', doubled: false });
    const soloInput = createSoloLashInput({ a: 25, b: -200, c: -175, d: -150 }, { eaterPlayerId: 'a', doubled: false });
    expect(validateLashInput(teamInput, partnershipGame)).toBe(true);
    expect(deriveFastRoundDelta(teamInput, partnershipGame)).toEqual({ x: -180, y: -320 });
    expect(validateLashInput(soloInput, soloGame)).toBe(true);
    expect(validateLashInput(soloInput, partnershipGame)).toBe(false);
  });
  it('يقبل لطشًا مجموعه -500 بما فيه قيمة موجبة ويرفض غيره', () => { const valid = { a: 25, b: -200, c: -175, d: -150 }; expect(validateLashScores(valid, players.map((player) => player.id))).toBe(true); expect(lashTotal(valid)).toBe(-500); expect(validateLashScores({ ...valid, d: -125 }, players.map((player) => player.id))).toBe(false); });
  it('يحوّل ترتيب التركس إلى 200 و150 و100 و50 ويجمعه للفريق', () => { const input = { kind: 'trix-ranking' as const, finishingOrder: ['a', 'b', 'c', 'd'] as [string, string, string, string] }; expect(trixRankingDelta(input.finishingOrder, players)).toEqual({ a: 200, b: 150, c: 100, d: 50 }); expect(deriveFastRoundDelta(input, partnershipGame)).toEqual({ x: 300, y: 200 }); expect(() => trixRankingDelta(['a', 'a', 'b', 'c'], players)).toThrow(); });
  it('يثبت توازن مملكة Fast Trix على مستوى الفريق عند صفر', () => { const lash = { x: -180, y: -320 }; const trix = { x: 300, y: 200 }; expect(validateFastKingdom([round('r0', 0, 'lash', lash), round('r1', 0, 'trix-ranking', trix)], 0, 'trix-fast')).toBe(true); expect({ x: lash.x + trix.x, y: lash.y + trix.y }).toEqual({ x: 120, y: -120 }); });
  it('يثبت CC عند -1000 للمملكة و-4000 للمباراة', () => { const lash = { x: -180, y: -320 }; const rounds = Array.from({ length: 8 }, (_, index) => round(`r${index}`, Math.floor(index / 2), 'lash', lash)); for (let kingdom = 0; kingdom < 4; kingdom += 1) expect(validateFastKingdom(rounds, kingdom, 'cc')).toBe(true); expect(rounds.reduce((sum, item) => sum + lashTotal(item.scoreDelta), 0)).toBe(CC_GAME_TOTAL); expect(CC_KINGDOM_TOTAL).toBe(-1000); });
  it('يدوّر صاحب المملكة من صاحب البداية', () => expect([0, 1, 2, 3].map((index) => ownerForKingdom(partnershipGame, index).id)).toEqual(['b', 'c', 'd', 'a']));
});
