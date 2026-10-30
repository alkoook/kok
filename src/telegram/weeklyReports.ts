import { db, enqueueTelegramMessage } from '../db/database';
import { calculateWeeklyCourt } from '../features/weekly/calculateWeeklyCourt';
import { getLocalWeekBounds, shiftLocalWeek, type WeekBounds } from '../features/weekly/weekWindow';
import type { TelegramOutboxKind } from '../types';
import { buildWeeklyTelegramReport, type WeeklyReportMode } from './weeklyComposer';

const manualKind: Record<WeeklyReportMode, TelegramOutboxKind> = { hero: 'weekly_hero_manual', donkey: 'weekly_donkey_manual', combined: 'weekly_report_manual' };

export async function enqueueManualWeeklyReport(bounds: WeekBounds, mode: WeeklyReportMode) {
  const [games, rounds] = await Promise.all([db.games.toArray(), db.rounds.toArray()]);
  const court = calculateWeeklyCourt(games, rounds, bounds);
  return enqueueTelegramMessage({ kind: manualKind[mode], sourceKey: bounds.key, messageText: buildWeeklyTelegramReport(court, bounds, mode) });
}

/** Queues the week that just closed. The settings ledger keeps this exactly-once even if an outbox row is deleted. */
export async function ensurePreviousWeeklyReport(reference = new Date()) {
  const settings = await db.settings.get('main');
  if (!settings?.telegramWeeklyAutoSend) return undefined;
  const current = getLocalWeekBounds(reference);
  const previous = shiftLocalWeek(current, -1);
  const sentKeys = settings.telegramWeeklyReportKeys ?? [];
  if (sentKeys.includes(previous.key)) return undefined;
  const [games, rounds] = await Promise.all([db.games.toArray(), db.rounds.toArray()]);
  const court = calculateWeeklyCourt(games, rounds, previous);
  if (!court.hero.winners.length && !court.donkey.winners.length) return undefined;
  const id = `weekly-report:${previous.key}`;
  const item = await enqueueTelegramMessage({ id, kind: 'weekly_report_auto', sourceKey: previous.key, messageText: buildWeeklyTelegramReport(court, previous, 'combined') });
  await db.settings.update('main', { telegramWeeklyReportKeys: [...new Set([...sentKeys, previous.key])] });
  return item;
}
