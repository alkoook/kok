import { describe, expect, it } from 'vitest';
import { aggregatePartnershipScores, calculateTrixRound, complementaryTeamCounts, scoreKingOfHearts, scoreQueens, validateKingdomBalance, validatePartnershipKingdomBalance } from './scoring';
import { DEFAULT_TRIX_RULES, partnershipContractTotal } from './rules';
import type { GamePlayer, GameTeam } from '../../types';

const players: GamePlayer[] = ['a', 'b', 'c', 'd'].map((id, seat) => ({ id, name: id, seat }));
const teams: GameTeam[] = [{ id: 'x', name: 'A', playerIds: ['a', 'c'] }, { id: 'y', name: 'B', playerIds: ['b', 'd'] }];

describe('محرك حساب التركس', () => {
  it('يحسب شيخ الكبة', () => expect(calculateTrixRound({ contract: 'king', selectedPlayerId: 'b' }, players, DEFAULT_TRIX_RULES)).toEqual({ a: 0, b: -75, c: 0, d: 0 }));
  it('يحسب البنات ومجموع الأربع', () => {
    const result = calculateTrixRound({ contract: 'queens', counts: { a: 1, b: 0, c: 3, d: 0 } }, players, DEFAULT_TRIX_RULES);
    expect(result.a).toBe(-25); expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(-100);
  });
  it('يحسب 13 ديناري', () => expect(Object.values(calculateTrixRound({ contract: 'diamonds', counts: { a: 13, b: 0, c: 0, d: 0 } }, players, DEFAULT_TRIX_RULES)).reduce((a, b) => a + b, 0)).toBe(-130));
  it('يحسب 13 لطش', () => expect(Object.values(calculateTrixRound({ contract: 'tricks', counts: { a: 3, b: 4, c: 3, d: 3 } }, players, DEFAULT_TRIX_RULES)).reduce((a, b) => a + b, 0)).toBe(-195));
  it('يحسب ترتيب التركس', () => expect(calculateTrixRound({ contract: 'trix', order: ['d', 'a', 'c', 'b'] }, players, DEFAULT_TRIX_RULES)).toEqual({ a: 150, b: 50, c: 100, d: 200 }));
  it('يجمع أقسام الكومبلكس', () => {
    const result = calculateTrixRound({ contract: 'complex', kingPlayerId: 'a', queens: { a: 1, b: 1, c: 1, d: 1 }, diamonds: { a: 4, b: 3, c: 3, d: 3 }, tricks: { a: 1, b: 4, c: 4, d: 4 } }, players, DEFAULT_TRIX_RULES);
    expect(result).toEqual({ a: -155, b: -115, c: -115, d: -115 });
  });
  it('يحسب شيخ الكبة المدبل مع التعويض', () => expect(scoreKingOfHearts('a', 'b', players, DEFAULT_TRIX_RULES)).toEqual({ a: -150, b: 75, c: 0, d: 0 }));
  it('إذا أكل المدبل الورقة يبقى عليه أصل العقوبة', () => expect(scoreKingOfHearts('b', 'b', players, DEFAULT_TRIX_RULES).b).toBe(-75));
  it('يحسب بنت مدبلة مع التعويض', () => expect(scoreQueens([{ id: 'q1', takenByPlayerId: 'a', doubled: true, doubledByPlayerId: 'b' }], players, DEFAULT_TRIX_RULES)).toEqual({ a: -50, b: 25, c: 0, d: 0 }));
  it('يسجل لطوش الشراكة على الفريقين', () => expect(aggregatePartnershipScores(calculateTrixRound({ contract: 'tricks', counts: { x: 8, y: 5 } }, players, DEFAULT_TRIX_RULES, teams), teams)).toEqual({ x: -120, y: -75 }));
  it('يسجل الديناري في الشراكة على الفريقين', () => expect(aggregatePartnershipScores(calculateTrixRound({ contract: 'diamonds', counts: { x: 8, y: 5 } }, players, DEFAULT_TRIX_RULES, teams), teams)).toEqual({ x: -80, y: -50 }));
  it.each([['diamonds', 13], ['tricks', 13]] as const)('يشتق طرف %s الثاني من مجموع القاعدة نفسه', (contract, total) => { expect(partnershipContractTotal(contract, DEFAULT_TRIX_RULES)).toBe(total); expect(complementaryTeamCounts('x', 8, partnershipContractTotal(contract, DEFAULT_TRIX_RULES)!, teams)).toEqual({ x: 8, y: 5 }); });
  it('بنت مدبلة — المدبل من الفريق الآخر: الفريق الآكل -50 والمقابل +25', () => {
    const result = calculateTrixRound({ contract: 'queens', queens: [{ id: 'hearts', suit: 'hearts', takenByTeamId: 'x', doubled: true, doubledByPlayerId: 'b' }] }, players, DEFAULT_TRIX_RULES, teams);
    expect(aggregatePartnershipScores(result, teams)).toEqual({ x: -50, y: 25 });
  });
  it('بنت مدبلة — المدبل من نفس فريق الآكل: الفريق الآكل -50 والمقابل +25', () => {
    const result = calculateTrixRound({ contract: 'queens', queens: [{ id: 'hearts', suit: 'hearts', takenByTeamId: 'x', doubled: true, doubledByPlayerId: 'a' }] }, players, DEFAULT_TRIX_RULES, teams);
    expect(aggregatePartnershipScores(result, teams)).toEqual({ x: -50, y: 25 });
  });
  it('الشيخ المدبل — المدبل من الفريق الآخر: الفريق الآكل -150 والمقابل +75', () => expect(aggregatePartnershipScores(scoreKingOfHearts('x', 'b', players, DEFAULT_TRIX_RULES, teams), teams)).toEqual({ x: -150, y: 75 }));
  it('الشيخ المدبل — المدبل من نفس فريق الآكل: الفريق الآكل -150 والمقابل +75', () => expect(aggregatePartnershipScores(scoreKingOfHearts('x', 'a', players, DEFAULT_TRIX_RULES, teams), teams)).toEqual({ x: -150, y: 75 }));
  it('يستخدم Complex قاعدة الفريق المقابل نفسها للتدبيل', () => {
    const result = calculateTrixRound({ contract: 'complex', kingTeamId: 'x', kingDoubled: true, kingDoubledByPlayerId: 'a', queens: [{ id: 'hearts', suit: 'hearts', takenByTeamId: 'x', doubled: true, doubledByPlayerId: 'a' }], diamonds: { x: 0, y: 13 }, tricks: { x: 0, y: 13 } }, players, DEFAULT_TRIX_RULES, teams);
    expect(aggregatePartnershipScores(result, teams)).toEqual({ x: -200, y: -225 });
  });
  it('تبقى مملكة الشراكة صفراً مع تدبيل من نفس فريق الآكل', () => {
    const rounds = [
      scoreKingOfHearts('x', 'a', players, DEFAULT_TRIX_RULES, teams),
      scoreQueens([
        { id: 'hearts', suit: 'hearts', takenByTeamId: 'x', doubled: true, doubledByPlayerId: 'a' },
        { id: 'diamonds', suit: 'diamonds', takenByTeamId: 'y', doubled: false },
        { id: 'clubs', suit: 'clubs', takenByTeamId: 'y', doubled: false },
        { id: 'spades', suit: 'spades', takenByTeamId: 'y', doubled: false }
      ], players, DEFAULT_TRIX_RULES, teams),
      calculateTrixRound({ contract: 'diamonds', counts: { x: 10, y: 3 } }, players, DEFAULT_TRIX_RULES, teams),
      calculateTrixRound({ contract: 'tricks', counts: { x: 0, y: 13 } }, players, DEFAULT_TRIX_RULES, teams),
      calculateTrixRound({ contract: 'trix', order: ['a', 'd', 'c', 'b'] }, players, DEFAULT_TRIX_RULES, teams)
    ];
    expect(validatePartnershipKingdomBalance(rounds, teams)).toBe(true);
    const totals = rounds.reduce((total, round) => { const delta = aggregatePartnershipScores(round, teams); return { x: total.x + delta.x, y: total.y + delta.y }; }, { x: 0, y: 0 });
    expect(totals).toEqual({ x: 0, y: 0 });
  });
  it('يحافظ على توازن المملكة مع التدبيل', () => {
    const rounds = [
      scoreKingOfHearts('a', 'b', players, DEFAULT_TRIX_RULES),
      scoreQueens([
        { id: 'q1', takenByPlayerId: 'a', doubled: true, doubledByPlayerId: 'c' },
        { id: 'q2', takenByPlayerId: 'b', doubled: false },
        { id: 'q3', takenByPlayerId: 'c', doubled: false },
        { id: 'q4', takenByPlayerId: 'd', doubled: false }
      ], players, DEFAULT_TRIX_RULES),
      calculateTrixRound({ contract: 'diamonds', counts: { a: 4, b: 3, c: 3, d: 3 } }, players, DEFAULT_TRIX_RULES),
      calculateTrixRound({ contract: 'tricks', counts: { a: 4, b: 3, c: 3, d: 3 } }, players, DEFAULT_TRIX_RULES),
      calculateTrixRound({ contract: 'trix', order: ['a', 'b', 'c', 'd'] }, players, DEFAULT_TRIX_RULES)
    ];
    expect(validateKingdomBalance(rounds)).toBe(true);
    const totalPlayers = Object.fromEntries(players.map((player) => [player.id, rounds.reduce((sum, round) => sum + round[player.id], 0)]));
    expect(Object.values(totalPlayers).reduce((sum, value) => sum + value, 0)).toBe(0);
    expect(Object.values(aggregatePartnershipScores(totalPlayers, [
      { id: 'x', name: 'X', playerIds: ['a', 'c'] }, { id: 'y', name: 'Y', playerIds: ['b', 'd'] }
    ])).reduce((sum, value) => sum + value, 0)).toBe(0);
    expect(validatePartnershipKingdomBalance(rounds, teams)).toBe(true);
  });
});
