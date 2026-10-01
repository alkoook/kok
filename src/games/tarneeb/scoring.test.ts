import { describe, expect, it } from 'vitest';
import { calculateTarneebRound, determineTarneebWinner } from './scoring';
import { createUnconfirmedTarneebRules } from './rules';

const base = { ...createUnconfirmedTarneebRules(61), confirmed: true };

describe('محرك حساب الطرنيب القابل للتخصيص', () => {
  it('يحسب نجاح ضمان 7 بحسب اللطوش الفعلية', () => {
    const result = calculateTarneebRound({ bidderId: 'p1', bidderTeamId: 'one', bid: 7, teamOneTricks: 9 }, ['one', 'two'], base);
    expect(result.contractSucceeded).toBe(true); expect(result.delta).toEqual({ one: 9, two: 4 });
  });
  it('يحسب فشل ضمان 9', () => {
    const result = calculateTarneebRound({ bidderId: 'p1', bidderTeamId: 'one', bid: 9, teamOneTricks: 8 }, ['one', 'two'], base);
    expect(result.contractSucceeded).toBe(false); expect(result.delta).toEqual({ one: -9, two: 5 });
  });
  it('يدعم ضمان 13 وقاعدة نقاط الضمان', () => {
    const rules = { ...base, scoringOnSuccessfulBid: 'bid-value' as const };
    expect(calculateTarneebRound({ bidderId: 'p2', bidderTeamId: 'two', bid: 13, teamOneTricks: 0 }, ['one', 'two'], rules).delta).toEqual({ one: 0, two: 13 });
  });
  it('يدعم preset مختلفًا عند الفشل', () => {
    const rules = { ...base, failedBidPenalty: 'custom' as const, failedBidCustomValue: -20, opponentsScoreOnBidFailure: 'fixed' as const, opponentsFailureValue: 10 };
    expect(calculateTarneebRound({ bidderId: 'p1', bidderTeamId: 'one', bid: 10, teamOneTricks: 6 }, ['one', 'two'], rules).delta).toEqual({ one: -20, two: 10 });
  });
  it('يكشف بلوغ الهدف وتجاوزه', () => {
    expect(determineTarneebWinner({ one: 61, two: 40 }, base)).toEqual(['one']);
    expect(determineTarneebWinner({ one: 64, two: 40 }, base)).toEqual(['one']);
  });
  it('يحترم الوصول الدقيق للهدف', () => {
    const rules = { ...base, exactTargetRequired: true };
    expect(determineTarneebWinner({ one: 62, two: 40 }, rules)).toEqual([]);
    expect(determineTarneebWinner({ one: 61, two: 40 }, rules)).toEqual(['one']);
  });
});
