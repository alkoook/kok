import type { GameRound, GameSession, LikhaRoundInput } from '../../types';
import { aggregateLikhaTeamScores, calculateLikhaRound } from './engine';

export type LikhaPlayerStats = {
  profileId: string; name: string; games: number; wins: number; losses: number; winRate: number;
  averageFinalScore: number; bestFinalScore: number; worstFinalScore: number; totalHearts: number; averageHeartsPerGame: number;
  queenSpades: number; doubledQueenSpades: number; jackDiamonds: number; doubledJackDiamonds: number;
  kingClubs: number; doubledKingClubs: number; tenDiamonds: number; doubledTenDiamonds: number; positiveTenPoints: number;
  worstRoundScore: number; bestRoundScore: number; largestNegativeSwing: number; limitBreaches: number;
};

type MutableStats = Omit<LikhaPlayerStats, 'winRate' | 'averageFinalScore' | 'averageHeartsPerGame' | 'bestFinalScore' | 'worstFinalScore' | 'worstRoundScore' | 'bestRoundScore'> & { finalScores: number[]; roundScores: number[] };

export type LikhaPartnershipStats = {
  key: string; profileIds: [string, string]; names: [string, string]; games: number; wins: number; losses: number;
  winRate: number; averageFinalScore: number; bestFinalScore: number; worstFinalScore: number;
};

export function calculateLikhaPlayerStats(games: GameSession[], rounds: GameRound[]): LikhaPlayerStats[] {
  const map = new Map<string, MutableStats>();
  games.filter((game) => game.gameType === 'likha' && game.status === 'completed' && game.rulesSnapshot.kind === 'likha-v1').forEach((game) => {
    const lossLimit = game.rulesSnapshot.kind === 'likha-v1' ? game.rulesSnapshot.rules.lossLimit : 210;
    game.players.filter((player) => player.profileId).forEach((player) => {
      const item = map.get(player.profileId!) ?? { profileId: player.profileId!, name: player.name, games: 0, wins: 0, losses: 0, totalHearts: 0, queenSpades: 0, doubledQueenSpades: 0, jackDiamonds: 0, doubledJackDiamonds: 0, kingClubs: 0, doubledKingClubs: 0, tenDiamonds: 0, doubledTenDiamonds: 0, positiveTenPoints: 0, largestNegativeSwing: 0, limitBreaches: 0, finalScores: [], roundScores: [] };
      const team = game.likhaMode === 'partnership' ? game.teams?.find((entry) => entry.playerIds.includes(player.id)) : undefined;
      item.name = player.name; item.games += 1; const won = game.winnerIds?.includes(team?.id ?? player.id) ?? false; item.wins += won ? 1 : 0; item.losses += won ? 0 : 1;
      const officialFinal = team ? aggregateLikhaTeamScores(game.scores, game.teams!)[team.id] ?? 0 : game.scores[player.id] ?? 0; item.finalScores.push(officialFinal); if (officialFinal <= -lossLimit) item.limitBreaches += 1;
      rounds.filter((round) => round.gameId === game.id && round.type === 'likha').forEach((round) => {
        const input = round.input as LikhaRoundInput; const capture = input.players.find((entry) => entry.playerId === player.id); item.totalHearts += capture?.heartsCount ?? 0;
        const delta = calculateLikhaRound(input, game.players.map((entry) => entry.id), game.teams)[player.id]; if (delta !== undefined) { item.roundScores.push(delta); item.largestNegativeSwing = Math.max(item.largestNegativeSwing, Math.max(0, -delta)); }
        const special = input.specialCards;
        if (special.queenSpades.capturedBy === player.id) { item.queenSpades += 1; if (special.queenSpades.doubled) item.doubledQueenSpades += 1; }
        if (special.jackDiamonds.capturedBy === player.id) { item.jackDiamonds += 1; if (special.jackDiamonds.doubled) item.doubledJackDiamonds += 1; }
        if (special.kingClubs.capturedBy === player.id) { item.kingClubs += 1; if (special.kingClubs.doubled) item.doubledKingClubs += 1; }
        if (special.tenDiamonds.capturedBy === player.id) { item.tenDiamonds += 1; if (special.tenDiamonds.doubled) item.doubledTenDiamonds += 1; item.positiveTenPoints += special.tenDiamonds.doubled ? 20 : 10; }
      });
      map.set(item.profileId, item);
    });
  });
  return [...map.values()].map(({ finalScores, roundScores, ...item }) => ({
    ...item, winRate: item.games ? item.wins / item.games * 100 : 0,
    averageFinalScore: finalScores.reduce((sum, value) => sum + value, 0) / Math.max(1, finalScores.length),
    bestFinalScore: finalScores.length ? Math.max(...finalScores) : 0, worstFinalScore: finalScores.length ? Math.min(...finalScores) : 0,
    averageHeartsPerGame: item.totalHearts / Math.max(1, item.games),
    worstRoundScore: roundScores.length ? Math.min(...roundScores) : 0, bestRoundScore: roundScores.length ? Math.max(...roundScores) : 0
  })).sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
}

export function calculateLikhaPartnershipStats(games: GameSession[]): LikhaPartnershipStats[] {
  const map = new Map<string, { profileIds: [string, string]; names: [string, string]; games: number; wins: number; losses: number; finals: number[] }>();
  games.filter((game) => game.gameType === 'likha' && game.status === 'completed' && game.likhaMode === 'partnership' && game.teams).forEach((game) => {
    game.teams!.forEach((team) => {
      const members = team.playerIds.map((id) => game.players.find((player) => player.id === id)).filter((player) => player?.profileId);
      if (members.length !== 2) return;
      const ordered = members.map((player) => ({ profileId: player!.profileId!, name: player!.name })).sort((a, b) => a.profileId.localeCompare(b.profileId));
      const key = ordered.map((player) => player.profileId).join('|');
      const item = map.get(key) ?? { profileIds: [ordered[0].profileId, ordered[1].profileId], names: [ordered[0].name, ordered[1].name], games: 0, wins: 0, losses: 0, finals: [] };
      const won = game.winnerIds?.includes(team.id) ?? false;
      item.games += 1; item.wins += won ? 1 : 0; item.losses += won ? 0 : 1;
      item.finals.push(aggregateLikhaTeamScores(game.scores, game.teams!)[team.id] ?? 0);
      map.set(key, item);
    });
  });
  return [...map.entries()].map(([key, item]) => ({
    key, profileIds: item.profileIds, names: item.names, games: item.games, wins: item.wins, losses: item.losses,
    winRate: item.games ? item.wins / item.games * 100 : 0,
    averageFinalScore: item.finals.reduce((sum, value) => sum + value, 0) / Math.max(1, item.finals.length),
    bestFinalScore: item.finals.length ? Math.max(...item.finals) : 0,
    worstFinalScore: item.finals.length ? Math.min(...item.finals) : 0
  })).sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
}
