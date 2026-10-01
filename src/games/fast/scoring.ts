import type { GamePlayer, GameRound, GameSession, GameTeam, LashRoundInput, PartnershipFixedTotalLashRoundInput, SoloLashRoundInput, TrixRankingInput } from '../../types';

export const LASH_TOTAL = -500;
export const TRIX_TOTAL = 500;
export const CC_KINGDOM_TOTAL = -1000;
export const CC_GAME_TOTAL = -4000;
export const TRIX_RANK_POINTS = [200, 150, 100, 50] as const;

export function lashTotal(scores: Record<string, number>): number {
  return Object.values(scores).reduce((sum, score) => sum + score, 0);
}

export function validateLashScores(scores: Record<string, number>, expectedIds: string[]): boolean {
  return expectedIds.length > 0 && expectedIds.every((id) => Number.isInteger(scores[id])) && Object.keys(scores).length === expectedIds.length && lashTotal(scores) === LASH_TOTAL;
}

export function validateLashInput(input: LashRoundInput, game: GameSession): boolean {
  if (game.trixMode === 'partnership') {
    if (!game.teams || game.teams.length !== 2) return false;
    if (input.kind === 'lash-partnership-fixed-total') return input.contractTotal === LASH_TOTAL && game.teams.some((team) => team.id === input.enteredTeamId) && Number.isInteger(input.enteredScore);
    return input.kind === 'lash-partnership' && validateLashScores(input.scoresByTeam, game.teams.map((team) => team.id));
  }
  return input.kind === 'lash-solo' && validateLashScores(input.scoresByPlayer, game.players.map((player) => player.id));
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

export function teamForPlayer(playerId: string, teams?: GameTeam[]): GameTeam | undefined {
  return teams?.find((team) => team.playerIds.includes(playerId));
}

export function createSoloLashInput(scoresByPlayer: Record<string, number>, oldMan: SoloLashRoundInput['oldMan']): SoloLashRoundInput {
  return { kind: 'lash-solo', scoresByPlayer, oldMan };
}

export function createPartnershipLashInput(enteredTeamId: string, enteredScore: number, oldMan: PartnershipFixedTotalLashRoundInput['oldMan'], contractTotal = LASH_TOTAL): PartnershipFixedTotalLashRoundInput {
  return { kind: 'lash-partnership-fixed-total', enteredTeamId, enteredScore, contractTotal, oldMan };
}

export function partnershipLashScores(input: Extract<LashRoundInput, { kind: 'lash-partnership' | 'lash-partnership-fixed-total' }>, teams: GameTeam[]): Record<string, number> {
  if (input.kind === 'lash-partnership') return { ...input.scoresByTeam };
  const otherTeam = teams.find((team) => team.id !== input.enteredTeamId);
  if (!otherTeam) return { [input.enteredTeamId]: input.enteredScore };
  return { [input.enteredTeamId]: input.enteredScore, [otherTeam.id]: input.contractTotal - input.enteredScore };
}

export function deriveFastRoundDelta(input: LashRoundInput | TrixRankingInput, game: GameSession): Record<string, number> {
  if (input.kind === 'lash-partnership' || input.kind === 'lash-partnership-fixed-total') return partnershipLashScores(input, game.teams ?? []);
  if (input.kind === 'lash-solo' || input.kind === 'lash') {
    if (input.kind === 'lash' && game.trixMode === 'partnership' && game.teams) {
      return Object.fromEntries(game.teams.map((team) => [team.id, team.playerIds.reduce((sum, id) => sum + (input.scoresByPlayer[id] ?? 0), 0)]));
    }
    return { ...input.scoresByPlayer };
  }
  const individual = trixRankingDelta(input.finishingOrder, game.players);
  if (game.trixMode === 'partnership' && game.teams) {
    return Object.fromEntries(game.teams.map((team) => [team.id, team.playerIds.reduce((sum, id) => sum + individual[id], 0)]));
  }
  return individual;
}

export function isFastGame(game: GameSession): boolean {
  return game.gameType === 'trix-fast' && (game.rulesSnapshot.kind === 'fast-trix-v3' || game.rulesSnapshot.kind === 'fast-trix-v4' || game.rulesSnapshot.kind === 'fast-trix-v5') || game.gameType === 'cc' && (game.rulesSnapshot.kind === 'cc-v1' || game.rulesSnapshot.kind === 'cc-v2' || game.rulesSnapshot.kind === 'cc-v3');
}
