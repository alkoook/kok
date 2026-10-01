import type { GamePlayer, GameRound, GameSession, GameTeam, LashRoundInput, TrixRankingInput } from '../../types';

export const LASH_TOTAL = -500;
export const TRIX_TOTAL = 500;
export const CC_KINGDOM_TOTAL = -1000;
export const CC_GAME_TOTAL = -4000;
export const TRIX_RANK_POINTS = [200, 150, 100, 50] as const;

export function lashTotal(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, score) => sum + score, 0);
}

export function validateLashScores(scores: Record<string, number>, players: GamePlayer[]): boolean {
  return players.length === 4 && players.every((player) => Number.isInteger(scores[player.id])) && lashTotal(scores) === LASH_TOTAL;
}

export function trixRankingDelta(order: string[], players: GamePlayer[]): Record<string, number> {
  if (order.length !== 4 || new Set(order).size !== 4 || order.some((id) => !players.some((player) => player.id === id))) {
    throw new Error('ترتيب التركس غير صالح');
  }
  return Object.fromEntries(order.map((id, index) => [id, TRIX_RANK_POINTS[index]]));
}

export function validateFastKingdom(rounds: GameRound[], kingdomIndex: number, gameType: 'trix-fast' | 'cc'): boolean {
  const kingdomRounds = rounds.filter((round) => round.kingdomIndex === kingdomIndex && round.type !== 'manual-adjustment');
  const expectedCount = 2;
  const expectedTotal = gameType === 'cc' ? CC_KINGDOM_TOTAL : 0;
  return kingdomRounds.length === expectedCount && kingdomRounds.reduce((sum, round) => sum + lashTotal(round.scoreDelta), 0) === expectedTotal;
}

export function ownerForKingdom(game: GameSession, kingdomIndex: number): GamePlayer {
  const first = Math.max(0, game.players.findIndex((player) => player.id === game.firstKingdomOwnerId));
  return game.players[(first + kingdomIndex) % 4];
}

export function partnerForPlayer(playerId: string, teams?: GameTeam[]): string | undefined {
  const team = teams?.find((item) => item.playerIds.includes(playerId));
  return team?.playerIds.find((id) => id !== playerId);
}

export function deriveFastRoundDelta(input: LashRoundInput | TrixRankingInput, players: GamePlayer[]): Record<string, number> {
  return input.kind === 'lash' ? { ...input.scoresByPlayer } : trixRankingDelta(input.finishingOrder, players);
}

export function isFastGame(game: GameSession): boolean {
  return game.gameType === 'trix-fast' && game.rulesSnapshot.kind === 'fast-trix-v3' || game.gameType === 'cc' && game.rulesSnapshot.kind === 'cc-v1';
}
