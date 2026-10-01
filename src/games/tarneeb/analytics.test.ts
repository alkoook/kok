import { describe, expect, it } from 'vitest';
import type { GameRound, GameSession, TarneebRoundInput } from '../../types';
import { TARNEEB_61_RULES_V2 } from './rules';
import { buildTarneeb61Attempts, buildTarneeb61SessionSummary, calculateHeadToHead, calculatePartnership, detectTarneeb61Records } from './analytics';

const players = [
  { id: 'p1', name: 'زياد', seat: 0 }, { id: 'p2', name: 'أحمد', seat: 1 },
  { id: 'p3', name: 'محمد', seat: 2 }, { id: 'p4', name: 'سامر', seat: 3 }
];
const teams = [
  { id: 'a', name: 'زياد ومحمد', playerIds: ['p1', 'p3'] as [string, string] },
  { id: 'b', name: 'أحمد وسامر', playerIds: ['p2', 'p4'] as [string, string] }
];
const game = (id = 'g1', winner = 'a'): GameSession => ({ id, gameType: 'tarneeb-61', status: 'completed', players, teams, createdAt: '2026-08-29T10:00:00.000Z', updatedAt: '2026-08-29T11:00:00.000Z', finishedAt: '2026-08-29T11:00:00.000Z', currentRound: 0, scores: winner === 'a' ? { a: 61, b: 48 } : { a: 47, b: 61 }, rulesSnapshot: { kind: 'tarneeb-61-v2', version: 2, rules: TARNEEB_61_RULES_V2 }, rulesVersion: 2, winnerIds: [winner] });

function round(index: number, bidderId: string, bid: number, actual: number, scoreAfter: Record<string, number> = { a: index, b: index }): GameRound {
  const bidderTeamId = teams.find((team) => team.playerIds.includes(bidderId))!.id;
  const input: TarneebRoundInput = { bidderId, bidderTeamId, bid, teamOneTricks: bidderTeamId === 'a' ? actual : 13 - actual };
  return { id: `r${index}`, gameId: 'g1', index, type: 'tarneeb', input, scoreDelta: {}, scoreAfter, createdAt: `2026-08-29T10:${String(index).padStart(2, '0')}:00.000Z` };
}

describe('تحليلات قعدة طرنيب 61', () => {
  it('يتعامل مع قعدة بلا ضمانات دون نسبة نجاح مضللة', () => {
    const summary = buildTarneeb61SessionSummary(game(), []);
    expect(summary.roundCount).toBe(0);
    expect(summary.playerStats.every((stat) => stat.successRate === undefined)).toBe(true);
  });

  it('لا يحسب Round ID نفسه مرتين', () => {
    const saved = round(0, 'p1', 8, 8);
    expect(buildTarneeb61Attempts(game(), [saved, saved])).toHaveLength(1);
  });

  it('يحسب النجاح والفشل والكبوت وانكسار 7 من المحرك الحالي', () => {
    const summary = buildTarneeb61SessionSummary(game(), [round(0, 'p1', 10, 13), round(1, 'p1', 7, 6)]);
    expect(summary.playerStats.find((stat) => stat.playerId === 'p1')).toMatchObject({ totalContracts: 2, successfulContracts: 1, failedContracts: 1, kaboots: 1, brokenSevens: 1, failedShortfall: 1, successfulSurplus: 3 });
    expect(summary.moments.map((moment) => moment.type)).toEqual(expect.arrayContaining(['kaboot', 'broken-seven']));
  });

  it('يتتبع streak اللاعب عبر محاولاته ولو ضمن لاعب آخر بينهما', () => {
    const summary = buildTarneeb61SessionSummary(game(), [round(0, 'p1', 7, 7), round(1, 'p2', 8, 8), round(2, 'p1', 8, 9), round(3, 'p1', 9, 7)]);
    expect(summary.playerStats.find((stat) => stat.playerId === 'p1')).toMatchObject({ longestSuccessStreak: 2, currentSuccessStreak: 0, currentFailureStreak: 1 });
  });

  it('يكتشف الكبوت الثاني بنفس القعدة', () => {
    const summary = buildTarneeb61SessionSummary(game(), [round(0, 'p1', 10, 13), round(1, 'p1', 11, 13)]);
    expect(summary.playerStats.find((stat) => stat.playerId === 'p1')?.kaboots).toBe(2);
    expect(summary.moments.some((moment) => moment.type === 'second-kaboot')).toBe(true);
  });

  it('يحترم الحد الأدنى لقناص الضمان', () => {
    const rounds = [round(0, 'p1', 7, 7), ...Array.from({ length: 8 }, (_, index) => round(index + 1, 'p2', 8, index === 7 ? 7 : 8))];
    const summary = buildTarneeb61SessionSummary(game(), rounds);
    const sniper = summary.awards.find((item) => item.id === 'contract-sniper');
    expect(sniper?.playerIds).toEqual(['p2']);
  });

  it('يحسب ألقاب البطولة والفضيحة بقواعد صريحة', () => {
    const rounds = [round(0, 'p1', 8, 8), round(1, 'p1', 9, 9), round(2, 'p1', 10, 10), round(3, 'p2', 7, 5), round(4, 'p2', 7, 6), round(5, 'p2', 9, 5)];
    const awards = buildTarneeb61SessionSummary(game(), rounds).awards;
    expect(awards.find((item) => item.id === 'session-king')?.playerIds).toContain('p1');
    expect(awards.find((item) => item.id === 'contract-sultan')?.playerIds).toContain('p1');
    expect(awards.find((item) => item.id === 'seven-nightmare')?.playerIds).toContain('p2');
    expect(awards.find((item) => item.id === 'failure-lover')?.playerIds).toContain('p2');
  });

  it('يبقي اللقب مشتركًا عند التعادل الحقيقي', () => {
    const summary = buildTarneeb61SessionSummary(game(), [round(0, 'p1', 8, 8), round(1, 'p3', 8, 8)]);
    expect(summary.awards.find((item) => item.id === 'session-king')?.playerIds).toEqual(['p1', 'p3']);
  });

  it('يحسب comeback من خط النتيجة وليس النتيجة النهائية فقط', () => {
    const summary = buildTarneeb61SessionSummary(game(), [round(0, 'p2', 10, 10, { a: 0, b: 18 }), round(1, 'p1', 13, 13, { a: 26, b: 18 }), round(2, 'p1', 10, 10, { a: 61, b: 48 })]);
    expect(summary.comeback).toEqual({ teamId: 'a', deficit: 18 });
    expect(summary.awards.some((award) => award.id === 'comeback')).toBe(true);
  });

  it('ينتج نفس الحكاية لنفس Game ID ولا يذكر حدثًا غير موجود', () => {
    const first = buildTarneeb61SessionSummary(game(), [round(0, 'p1', 8, 8)]);
    const second = buildTarneeb61SessionSummary(game(), [round(0, 'p1', 8, 8)]);
    expect(first.story).toBe(second.story);
    expect(first.story).not.toContain('الكبوت حضر');
    expect(first.story).not.toContain('انقلبت');
  });

  it('لا يحسب الشريكين مواجهة ويحسبهما كشراكة', () => {
    const g = game(); const rounds = [round(0, 'p1', 8, 8), round(1, 'p3', 8, 8)];
    expect(calculateHeadToHead([g], rounds, 'p1', 'p3').games).toBe(0);
    expect(calculatePartnership([g], rounds, 'p1', 'p3')).toMatchObject({ games: 1, wins: 1 });
  });

  it('يحسب المواجهات فقط عندما يكون اللاعبان بفرق متقابلة', () => {
    const first = game('g1', 'a'); const second = { ...game('g2', 'b'), players, teams };
    expect(calculateHeadToHead([first, second], [], 'p1', 'p2')).toMatchObject({ games: 2, wins: { p1: 1, p2: 1 } });
  });

  it('يقارن الرقم القياسي بالقعدات السابقة ولا يدخل القعدة الحالية في baseline', () => {
    const current = buildTarneeb61SessionSummary(game('g1'), [round(0, 'p1', 10, 13), round(1, 'p1', 11, 13)]);
    expect(detectTarneeb61Records(current, [current]).find((record) => record.id === 'session-kaboots')?.value).toBe(2);
    const previous = buildTarneeb61SessionSummary(game('old'), []);
    expect(detectTarneeb61Records(current, [previous]).some((record) => record.id === 'session-kaboots')).toBe(true);
  });
});
