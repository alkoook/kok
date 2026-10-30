import type { GamePlayer, GameTeam } from '../types';

/** Canonical fixed-seat partnership: opposite seats are partners. */
export const FIXED_PARTNERSHIP_SEATS = [[0, 2], [1, 3]] as const;

export function fixedPartnershipMembers(players: GamePlayer[]): [[GamePlayer, GamePlayer], [GamePlayer, GamePlayer]] {
  if (players.length !== 4) throw new Error('Fixed partnerships require exactly four seated players');
  return FIXED_PARTNERSHIP_SEATS.map(([first, second]) => [players[first], players[second]]) as [[GamePlayer, GamePlayer], [GamePlayer, GamePlayer]];
}

export function fixedPartnershipPlayerIds(players: GamePlayer[]): [GameTeam['playerIds'], GameTeam['playerIds']] {
  return fixedPartnershipMembers(players).map(([first, second]) => [first.id, second.id]) as [GameTeam['playerIds'], GameTeam['playerIds']];
}
