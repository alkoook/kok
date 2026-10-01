import { describe, expect, it } from 'vitest';
import { TARNEEB_61_RULES_V2 } from './rules';
import { calculateTarneeb61Round } from './scoring';

const round = (bid: number, bidderTricks: number) => calculateTarneeb61Round(
  { bidderId: 'p1', bidderTeamId: 'a', bid, teamOneTricks: bidderTricks }, ['a', 'b'], TARNEEB_61_RULES_V2
).delta;

describe('قواعد طرنيب 61 — الإصدار 2', () => {
  it('ضمان 11 وجلب 11', () => expect(round(11, 11)).toEqual({ a: 11, b: 0 }));
  it('ضمان 8 وجلب 11', () => expect(round(8, 11)).toEqual({ a: 11, b: 0 }));
  it('ضمان 11 وجلب 10 يخسر قيمة الضمان كاملة، وليس -1 أو -10', () => expect(round(11, 10)).toEqual({ a: -11, b: 3 }));
  it('ضمان 9 وجلب 8', () => expect(round(9, 8)).toEqual({ a: -9, b: 5 }));
  it('ضمان 7 وجلب 6', () => expect(round(7, 6)).toEqual({ a: -7, b: 7 }));
  it('ضمان 7 وجلب 13', () => expect(round(7, 13)).toEqual({ a: 16, b: 0 }));
  it('ضمان 11 وجلب 13', () => expect(round(11, 13)).toEqual({ a: 16, b: 0 }));
  it('ضمان 13 وجلب 13', () => expect(round(13, 13)).toEqual({ a: 26, b: 0 }));
  it('ضمان 13 وجلب 12', () => expect(round(13, 12)).toEqual({ a: -26, b: 1 }));
  it('ضمان 13 وجلب 10', () => expect(round(13, 10)).toEqual({ a: -26, b: 3 }));
  it('يطبق نفس القاعدة عندما يكون الفريق الثاني هو الضامن', () => {
    const result = calculateTarneeb61Round(
      { bidderId: 'p2', bidderTeamId: 'b', bid: 11, teamOneTricks: 3 }, ['a', 'b'], TARNEEB_61_RULES_V2
    ).delta;
    expect(result).toEqual({ a: 3, b: -11 });
  });
});
