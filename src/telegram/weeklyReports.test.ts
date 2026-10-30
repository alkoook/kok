import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, initializeDatabase } from '../db/database';
import { getLocalWeekBounds, shiftLocalWeek } from '../features/weekly/weekWindow';
import type { GameSession } from '../types';
import { enqueueManualWeeklyReport, ensurePreviousWeeklyReport } from './weeklyReports';

const players = [
  { id: 'a', profileId: 'pa', name: 'أحمد', seat: 0 },
  { id: 'b', profileId: 'pb', name: 'سامر', seat: 1 }
];

function completed(id: string, finishedAt: Date, winnerId = 'a'): GameSession {
  return {
    id,
    gameType: 'likha',
    status: 'completed',
    players,
    createdAt: finishedAt.toISOString(),
    updatedAt: finishedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    currentRound: 0,
    scores: { a: winnerId === 'a' ? -10 : -30, b: winnerId === 'b' ? -10 : -30 },
    winnerIds: [winnerId],
    rulesSnapshot: { kind: 'likha-v1', version: 1, rules: { version: 1, lossLimit: 210 } }
  };
}

describe('weekly Telegram reports', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await initializeDatabase();
  });
  afterEach(async () => db.close());

  it('queues hero, donkey, and combined manual reports and allows intentional repeats', async () => {
    const bounds = getLocalWeekBounds(new Date(2026, 10, 8, 13));
    await db.games.bulkAdd([completed('g1', new Date(2026, 10, 8, 14)), completed('g2', new Date(2026, 10, 9, 14))]);
    const hero = await enqueueManualWeeklyReport(bounds, 'hero');
    const donkey = await enqueueManualWeeklyReport(bounds, 'donkey');
    const combined = await enqueueManualWeeklyReport(bounds, 'combined');
    const repeated = await enqueueManualWeeklyReport(bounds, 'combined');
    expect([hero.kind, donkey.kind, combined.kind]).toEqual(['weekly_hero_manual', 'weekly_donkey_manual', 'weekly_report_manual']);
    expect(combined.messageText).toContain('بطل الأسبوع');
    expect(combined.messageText).toContain('حمار الأسبوع');
    expect(repeated.id).not.toBe(combined.id);
    expect(await db.telegramOutbox.count()).toBe(4);
  });

  it('queues the week that just closed once when startup occurs after Saturday 10', async () => {
    const reference = new Date(2026, 10, 14, 13);
    const previous = shiftLocalWeek(getLocalWeekBounds(reference), -1);
    await db.games.bulkAdd([completed('g1', new Date(2026, 10, 8, 14)), completed('g2', new Date(2026, 10, 9, 14))]);
    await db.settings.update('main', { telegramWeeklyAutoSend: true });
    const first = await ensurePreviousWeeklyReport(reference);
    const second = await ensurePreviousWeeklyReport(reference);
    expect(first).toMatchObject({ id: `weekly-report:${previous.key}`, kind: 'weekly_report_auto', sourceKey: previous.key, status: 'pending' });
    expect(second).toBeUndefined();
    expect(await db.telegramOutbox.count()).toBe(1);
    expect((await db.settings.get('main'))?.telegramWeeklyReportKeys).toEqual([previous.key]);
  });

  it('does not create an automatic report while the weekly toggle is disabled', async () => {
    await db.games.bulkAdd([completed('g1', new Date(2026, 10, 8, 14)), completed('g2', new Date(2026, 10, 9, 14))]);
    expect(await ensurePreviousWeeklyReport(new Date(2026, 10, 14, 13))).toBeUndefined();
    expect(await db.telegramOutbox.count()).toBe(0);
  });
});
