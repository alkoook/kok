import type { GameRound, GameSession } from '../../types';
import { calculateWeeklyDonkey } from '../weekly-donkey/calculateWeeklyDonkey';
import { calculateWeeklyHero } from '../weekly-hero/calculateWeeklyHero';
import { getLocalWeekBounds, type WeekBounds } from './weekWindow';

export function calculateWeeklyCourt(games: GameSession[], rounds: GameRound[], bounds: WeekBounds = getLocalWeekBounds()) {
  return {
    bounds,
    hero: calculateWeeklyHero(games, rounds, bounds),
    donkey: calculateWeeklyDonkey(games, rounds, bounds)
  };
}
