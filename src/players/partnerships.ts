import type { GameRound, GameSession, LashRoundInput, TrixRankingInput } from '../types';

export type PartnershipStats = {
  profileIds: [string, string]; names: [string, string]; games: number; wins: number; losses: number; winRate: number;
  averageFinalScore: number; bestFinalScore: number; worstFinalScore: number; bestFastKingdom?: number; worstFastKingdom?: number;
  trixPoints: number; ranks: Record<string, [number, number, number, number]>; oldMan: number; doubledOldMan: number;
  ccGames: number; ccWins: number; bestCcKingdom?: number; worstCcKingdom?: number;
};

type PairSession = { game: GameSession; teamId: string; playerIds: [string, string]; rounds: GameRound[]; score: number; won: boolean };
const pairKey = (ids: string[]) => [...ids].sort().join('|');
const teamScore = (game: GameSession, teamId: string, playerIds: [string, string]) => game.scores[teamId] ?? playerIds.reduce((sum, id) => sum + (game.scores[id] ?? 0), 0);
const roundTeamScore = (round: GameRound, teamId: string, playerIds: [string, string]) => round.scoreDelta[teamId] ?? playerIds.reduce((sum, id) => sum + (round.scoreDelta[id] ?? 0), 0);

function sessionsForPair(profileIds: [string, string], games: GameSession[], rounds: GameRound[]): PairSession[] {
  const key = pairKey(profileIds);
  return games.filter((game) => game.status === 'completed' && (game.gameType === 'trix-fast' || game.gameType === 'cc') && game.trixMode === 'partnership' && game.teams).flatMap((game) => {
    const team = game.teams!.find((candidate) => pairKey(candidate.playerIds.map((playerId) => game.players.find((player) => player.id === playerId)?.profileId).filter((id): id is string => Boolean(id))) === key);
    if (!team) return [];
    return [{ game, teamId: team.id, playerIds: team.playerIds, rounds: rounds.filter((round) => round.gameId === game.id), score: teamScore(game, team.id, team.playerIds), won: Boolean(game.winnerIds?.includes(team.id)) }];
  });
}

export function calculateFastPartnership(profileIds: [string, string], games: GameSession[], rounds: GameRound[]): PartnershipStats | undefined {
  const sessions = sessionsForPair(profileIds, games, rounds);
  if (!sessions.length) return undefined;
  const names = profileIds.map((profileId) => games.flatMap((game) => game.players).find((player) => player.profileId === profileId)?.name ?? profileId) as [string, string];
  const kingdomScores = sessions.filter((session) => session.game.gameType === 'trix-fast').flatMap((session) => Array.from({ length: 4 }, (_, kingdom) => session.rounds.filter((round) => round.kingdomIndex === kingdom && round.type !== 'manual-adjustment').reduce((sum, round) => sum + roundTeamScore(round, session.teamId, session.playerIds), 0)));
  const ccKingdoms = sessions.filter((session) => session.game.gameType === 'cc').flatMap((session) => Array.from({ length: 4 }, (_, kingdom) => session.rounds.filter((round) => round.kingdomIndex === kingdom && round.type !== 'manual-adjustment').reduce((sum, round) => sum + roundTeamScore(round, session.teamId, session.playerIds), 0)));
  const ranks: Record<string, [number, number, number, number]> = Object.fromEntries(profileIds.map((id) => [id, [0, 0, 0, 0]]));
  let trixPoints = 0; let oldMan = 0; let doubledOldMan = 0;
  sessions.forEach((session) => session.rounds.forEach((round) => {
    if (round.type === 'trix-ranking') (round.input as TrixRankingInput).finishingOrder.forEach((playerId, rank) => { const profileId = session.game.players.find((player) => player.id === playerId)?.profileId; if (profileId && profileIds.includes(profileId)) { ranks[profileId][rank] += 1; trixPoints += [200, 150, 100, 50][rank]; } });
    if (round.type === 'lash') { const eater = (round.input as LashRoundInput).oldMan; const profileId = session.game.players.find((player) => player.id === eater.eaterPlayerId)?.profileId; if (profileId && profileIds.includes(profileId)) { oldMan += 1; if (eater.doubled) doubledOldMan += 1; } }
  }));
  const scores = sessions.map((session) => session.score); const wins = sessions.filter((session) => session.won).length; const cc = sessions.filter((session) => session.game.gameType === 'cc');
  return { profileIds, names, games: sessions.length, wins, losses: sessions.length - wins, winRate: wins / sessions.length * 100, averageFinalScore: scores.reduce((sum, score) => sum + score, 0) / scores.length, bestFinalScore: Math.max(...scores), worstFinalScore: Math.min(...scores), bestFastKingdom: kingdomScores.length ? Math.max(...kingdomScores) : undefined, worstFastKingdom: kingdomScores.length ? Math.min(...kingdomScores) : undefined, trixPoints, ranks, oldMan, doubledOldMan, ccGames: cc.length, ccWins: cc.filter((session) => session.won).length, bestCcKingdom: ccKingdoms.length ? Math.max(...ccKingdoms) : undefined, worstCcKingdom: ccKingdoms.length ? Math.min(...ccKingdoms) : undefined };
}

export type PartnershipComparison = { left: [string, string]; right: [string, string]; meetings: number; leftWins: number; rightWins: number; leftLosses: number; rightLosses: number; ties: number; averageMargin: number; fastTrixGames: number; fastTrixLeftWins: number; fastTrixRightWins: number; ccGames: number; ccLeftWins: number; ccRightWins: number };
export function compareFastPartnerships(left: [string, string], right: [string, string], games: GameSession[]): PartnershipComparison | undefined {
  const leftKey = pairKey(left); const rightKey = pairKey(right);
  const meetings = games.filter((game) => game.status === 'completed' && (game.gameType === 'trix-fast' || game.gameType === 'cc') && game.trixMode === 'partnership' && game.teams).flatMap((game) => {
    const keyed = game.teams!.map((team) => ({ team, key: pairKey(team.playerIds.map((id) => game.players.find((player) => player.id === id)?.profileId).filter((id): id is string => Boolean(id))) }));
    const leftTeam = keyed.find((item) => item.key === leftKey)?.team; const rightTeam = keyed.find((item) => item.key === rightKey)?.team;
    if (!leftTeam || !rightTeam) return [];
    const leftScore = teamScore(game, leftTeam.id, leftTeam.playerIds); const rightScore = teamScore(game, rightTeam.id, rightTeam.playerIds);
    return [{ game, leftTeam, rightTeam, leftScore, rightScore }];
  });
  if (!meetings.length) return undefined;
  const leftWins = meetings.filter((item) => item.leftScore > item.rightScore).length;
  const rightWins = meetings.filter((item) => item.rightScore > item.leftScore).length;
  const fastTrix = meetings.filter((item) => item.game.gameType === 'trix-fast');
  const cc = meetings.filter((item) => item.game.gameType === 'cc');
  return { left, right, meetings: meetings.length, leftWins, rightWins, leftLosses: rightWins, rightLosses: leftWins, ties: meetings.length - leftWins - rightWins, averageMargin: meetings.reduce((sum, item) => sum + Math.abs(item.leftScore - item.rightScore), 0) / meetings.length, fastTrixGames: fastTrix.length, fastTrixLeftWins: fastTrix.filter((item) => item.leftScore > item.rightScore).length, fastTrixRightWins: fastTrix.filter((item) => item.rightScore > item.leftScore).length, ccGames: cc.length, ccLeftWins: cc.filter((item) => item.leftScore > item.rightScore).length, ccRightWins: cc.filter((item) => item.rightScore > item.leftScore).length };
}

export function allFastPartnerships(games: GameSession[], rounds: GameRound[]): PartnershipStats[] {
  const pairs = new Map<string, [string, string]>();
  games.filter((game) => game.teams && game.trixMode === 'partnership' && (game.gameType === 'trix-fast' || game.gameType === 'cc')).forEach((game) => game.teams!.forEach((team) => { const ids = team.playerIds.map((id) => game.players.find((player) => player.id === id)?.profileId).filter((id): id is string => Boolean(id)); if (ids.length === 2) pairs.set(pairKey(ids), ids as [string, string]); }));
  return [...pairs.values()].map((pair) => calculateFastPartnership(pair, games, rounds)).filter((stats): stats is PartnershipStats => Boolean(stats)).sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}
