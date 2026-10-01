import { describe, expect, it } from 'vitest';
import type { GameTeam, Tarneeb41Phase } from '../../types';
import { TARNEEB_41_RULES_V2 } from './rules';
import { deriveTarneeb41Phase, determineTarneeb41Winner, scoreTarneeb41Player, tarneeb41MinimumBid, validateTarneeb41Bids } from './scoring';

const score = (bid: number, tricks: number, phase: Tarneeb41Phase = 'normal') => scoreTarneeb41Player({ playerId: 'p1', bid, actualTricks: tricks }, phase).scoreDelta;
const bids = (values: number[], phase: Tarneeb41Phase = 'normal') => validateTarneeb41Bids(values.map((bid, index) => ({ playerId: `p${index + 1}`, bid })), phase, TARNEEB_41_RULES_V2).valid;
const teams: GameTeam[] = [
  { id: 'a', name: 'أ', playerIds: ['p1', 'p3'] },
  { id: 'b', name: 'ب', playerIds: ['p2', 'p4'] }
];

describe('قواعد طرنيب 41 — الإصدار 2', () => {
  it.each([[2, 2, 2], [3, 3, 3], [5, 5, 10], [6, 6, 12], [7, 7, 14], [8, 8, 16], [9, 9, 27], [13, 13, 39]])('نجاح ضمان %i يعطي +%i حسب قيمة العقد', (bid, tricks, expected) => expect(score(bid, tricks)).toBe(expected));
  it.each([[2, 1, -2], [3, 2, -3], [5, 4, -10], [9, 8, -27]])('فشل ضمان %i يعطي القيمة السالبة', (bid, tricks, expected) => expect(score(bid, tricks)).toBe(expected));
  it('اللطوش الزائدة لا تغيّر قيمة العقد', () => expect(score(5, 8)).toBe(10));
  it('يحسِب كل لاعب مستقلاً', () => { expect(score(3, 2)).toBe(-3); expect(score(5, 5)).toBe(10); });

  it('يرفض 2+2+2+2 = 8', () => expect(bids([2, 2, 2, 2])).toBe(false));
  it('يرفض 2+3+2+3 = 10', () => expect(bids([2, 3, 2, 3])).toBe(false));
  it('يقبل 2+3+2+4 = 11', () => expect(bids([2, 3, 2, 4])).toBe(true));
  it('يقبل 2+3+3+4 = 12', () => expect(bids([2, 3, 3, 4])).toBe(true));
  it('يحتفظ بتحقق مجموع 11 في مرحلة 30', () => expect(bids([3, 3, 3, 3], 'thirty')).toBe(true));
  it('يحتفظ بتحقق مجموع 11 في مرحلة 41 المحجوبة', () => expect(bids([4, 4, 4, 4], 'blocked-41')).toBe(true));

  it('مرحلة 30 تلغي المضاعفات وترفع الحد الأدنى', () => { expect(tarneeb41MinimumBid('thirty')).toBe(3); expect(score(7, 7, 'thirty')).toBe(7); expect(score(7, 6, 'thirty')).toBe(-7); expect(score(9, 9, 'thirty')).toBe(9); });
  it('فشل ضمان 5 بجلب 4 في مرحلة 30 يعطي -5', () => expect(score(5, 4, 'thirty')).toBe(-5));
  it('نجاح ضمان 7 بجلب 9 في مرحلة 30 يعطي +7', () => expect(score(7, 9, 'thirty')).toBe(7));
  it('فشل ضمان 5 بجلب 4 في مرحلة 41 المحجوبة يعطي -5', () => expect(score(5, 4, 'blocked-41')).toBe(-5));
  it('يشتق مرحلة 30 من النتائج', () => expect(deriveTarneeb41Phase({ p1: 30, p2: 2, p3: 2, p4: 2 }, teams)).toBe('thirty'));
  it('لا يفوز فريق اللاعب 42 إذا كان شريكه صفراً أو سالباً', () => { expect(determineTarneeb41Winner({ p1: 42, p2: 2, p3: 0, p4: 2 }, teams)).toEqual([]); expect(deriveTarneeb41Phase({ p1: 42, p2: 2, p3: -3, p4: 2 }, teams)).toBe('blocked-41'); expect(tarneeb41MinimumBid('blocked-41')).toBe(4); });
  it('يفوز الفريق عندما يصبح الشريك موجباً', () => expect(determineTarneeb41Winner({ p1: 42, p2: 2, p3: 1, p4: 2 }, teams)).toEqual(['a']));
});
