import { aggregateLikhaTeamScores } from '../games/likha/engine';
import { aggregatePartnershipScores } from '../games/trix/scoring';
import type { GameSession } from '../types';
import { isTrix } from '../utils';

export type OfficialStanding = { id: string; name: string; score: number; rank: number; winner: boolean; playerIds: string[] };

export function officialScoreMap(game: GameSession): Record<string, number> {
  if (game.gameType === 'likha' && game.likhaMode === 'partnership' && game.teams) return aggregateLikhaTeamScores(game.scores, game.teams);
  if (game.gameType === 'tarneeb-41' && game.teams) return Object.fromEntries(game.teams.map((team) => [team.id, team.playerIds.reduce((sum, id) => sum + (game.scores[id] ?? 0), 0)]));
  if (game.trixMode === 'partnership' && game.teams && game.gameType === 'trix-slow') return aggregatePartnershipScores(game.scores, game.teams);
  if (game.teams && (game.gameType === 'tarneeb-61' || (game.gameType === 'trix-fast' || game.gameType === 'cc') && game.trixMode === 'partnership')) return Object.fromEntries(game.teams.map((team) => [team.id, game.scores[team.id] ?? 0]));
  if (isTrix(game.gameType) || game.gameType === 'cc' || game.gameType === 'likha') return Object.fromEntries(game.players.map((player) => [player.id, game.scores[player.id] ?? 0]));
  return { ...game.scores };
}

export function buildOfficialStandings(game: GameSession): OfficialStanding[] {
  const scores = officialScoreMap(game);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const best = sorted[0]?.[1]; let previous: number | undefined; let rank = 0;
  return sorted.map(([id, score], index) => {
    if (score !== previous) rank = index + 1;
    previous = score;
    const team = game.teams?.find((entry) => entry.id === id);
    const player = game.players.find((entry) => entry.id === id);
    return { id, name: team?.name ?? player?.name ?? id, score, rank, winner: score === best, playerIds: team?.playerIds ?? (player ? [player.id] : []) };
  });
}

export function currentWinnerIds(game: GameSession) { return buildOfficialStandings(game).filter((entry) => entry.winner).map((entry) => entry.id); }
