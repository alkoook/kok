import type { GameSession } from '../../types';

export type WeekBounds = { key: string; start: Date; endExclusive: Date };

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** KOK weeks run from Saturday 10:00 local time to the following Saturday 10:00. */
export function getLocalWeekBounds(reference = new Date()): WeekBounds {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 10, 0, 0, 0);
  const distanceFromSaturday = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - distanceFromSaturday);
  if (reference.getTime() < start.getTime()) start.setDate(start.getDate() - 7);
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 7);
  return { key: `${localDateKey(start)}T10:00-local`, start, endExclusive };
}

export function shiftLocalWeek(bounds: WeekBounds, offset: number): WeekBounds {
  const reference = new Date(bounds.start);
  reference.setDate(reference.getDate() + offset * 7);
  return getLocalWeekBounds(reference);
}

export function isCompletedGameInWeek(game: GameSession, bounds: WeekBounds) {
  if (game.status !== 'completed') return false;
  // finishedAt is authoritative. updatedAt only keeps legacy completed sessions visible.
  const completedAt = new Date(game.finishedAt ?? game.updatedAt);
  return completedAt >= bounds.start && completedAt < bounds.endExclusive;
}

export function didPlayerWin(game: GameSession, playerId: string) {
  const team = game.teams?.find((entry) => entry.playerIds.includes(playerId));
  return Boolean(game.winnerIds?.includes(team?.id ?? playerId));
}
