import type { ReturnTypeOfWeeklyCourt } from './weeklyTypes';
import type { WeekBounds } from '../features/weekly/weekWindow';
import { buildWeeklyHeroLine } from '../features/weekly-hero/buildWeeklyHeroLine';
import { buildWeeklyRoast } from '../features/weekly-donkey/buildWeeklyRoast';

export type WeeklyReportMode = 'hero' | 'donkey' | 'combined';

const label = (date: Date) => new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(date);
const separator = '━━━━━━━━━━━━━━';

function heroSection(court: ReturnTypeOfWeeklyCourt, bounds: WeekBounds) {
  const winners = court.hero.winners;
  if (!winners.length) return '👑 بطل الأسبوع\nلم يستحق أحد التاج في هذه الفترة.';
  const ids = winners.map((winner) => winner.profileId).join('-');
  return [`👑 ${winners.length > 1 ? 'أبطال الأسبوع' : 'بطل الأسبوع'}`, winners.map((winner) => winner.name).join(' و '), '', '📊 لماذا؟', ...winners.flatMap((winner) => winner.reasons.map((reason) => `• ${reason.replace(/^[^\p{L}\p{N}]+/u, '')}`)), '', `⭐ التقييم\n${buildWeeklyHeroLine(bounds.key, ids)}`].join('\n');
}

function donkeySection(court: ReturnTypeOfWeeklyCourt, bounds: WeekBounds) {
  const winners = court.donkey.winners;
  if (!winners.length) return '🐴 حمار الأسبوع\nلم يسجل أحد تعثرات كافية في هذه الفترة.';
  const ids = winners.map((winner) => winner.profileId).join('-');
  return [`🐴 ${winners.length > 1 ? 'حمير الأسبوع' : 'حمار الأسبوع'}`, winners.map((winner) => winner.name).join(' و '), '', '📊 الأسباب', ...winners.flatMap((winner) => winner.reasons.map((reason) => `• ${reason.replace(/^[^\p{L}\p{N}]+/u, '')}`)), '', `📉 التقييم\n${buildWeeklyRoast(bounds.key, ids)}`].join('\n');
}

export function buildWeeklyTelegramReport(court: ReturnTypeOfWeeklyCourt, bounds: WeekBounds, mode: WeeklyReportMode) {
  const period = `📅 الفترة\n${label(bounds.start)}\nحتى\n${label(bounds.endExclusive)}`;
  const body = mode === 'hero' ? heroSection(court, bounds) : mode === 'donkey' ? donkeySection(court, bounds) : `${heroSection(court, bounds)}\n\n${separator}\n\n${donkeySection(court, bounds)}`;
  return `${body}\n\n${period}\n\n${separator}\nKOK`;
}
