import type { DoubledQueenResult, GamePlayer, GameTeam, TrixRoundInput, TrixRules } from '../../types';

const emptyScores = (players: GamePlayer[]) => Object.fromEntries(players.map((player) => [player.id, 0]));

function addTargetScore(result: Record<string, number>, targetId: string, amount: number, players: GamePlayer[], teams?: GameTeam[]) {
  if (players.some((player) => player.id === targetId)) result[targetId] += amount;
  else {
    const team = teams?.find((item) => item.id === targetId);
    if (team) result[team.playerIds[0]] += amount;
  }
}

function doublingBonusTarget(takenById: string, doubledByPlayerId: string, teams?: GameTeam[]) {
  if (!teams || teams.length !== 2) return doubledByPlayerId;
  const takerTeam = teams.find((team) => team.id === takenById || team.playerIds.includes(takenById));
  return takerTeam ? teams.find((team) => team.id !== takerTeam.id)?.id ?? doubledByPlayerId : doubledByPlayerId;
}

export function scoreKingOfHearts(takenById: string, doubledByPlayerId: string | undefined, players: GamePlayer[], rules: TrixRules, teams?: GameTeam[]) {
  const result = emptyScores(players);
  addTargetScore(result, takenById, doubledByPlayerId ? rules.kingPenalty * 2 : rules.kingPenalty, players, teams);
  if (doubledByPlayerId) addTargetScore(result, doublingBonusTarget(takenById, doubledByPlayerId, teams), Math.abs(rules.kingPenalty), players, teams);
  return result;
}

export function scoreQueens(queens: DoubledQueenResult[], players: GamePlayer[], rules: TrixRules, teams?: GameTeam[]) {
  const result = emptyScores(players);
  queens.forEach((queen) => {
    const takenById = queen.takenByTeamId ?? queen.takenByPlayerId ?? '';
    addTargetScore(result, takenById, queen.doubled ? rules.queenPenalty * 2 : rules.queenPenalty, players, teams);
    if (queen.doubled && queen.doubledByPlayerId) addTargetScore(result, doublingBonusTarget(takenById, queen.doubledByPlayerId, teams), Math.abs(rules.queenPenalty), players, teams);
  });
  return result;
}

export const sumScoreDelta = (delta: Record<string, number>) => Object.values(delta).reduce((sum, value) => sum + value, 0);
export const validateKingdomBalance = (deltas: Record<string, number>[]) => deltas.reduce((total, delta) => total + sumScoreDelta(delta), 0) === 0;

export function aggregatePartnershipScores(playerDelta: Record<string, number>, teams: GameTeam[]) {
  return Object.fromEntries(teams.map((team) => [team.id, team.playerIds.reduce((sum, id) => sum + (playerDelta[id] ?? 0), 0)]));
}

export function validatePartnershipKingdomBalance(deltas: Record<string, number>[], teams: GameTeam[]) {
  return deltas.reduce((total, delta) => total + sumScoreDelta(aggregatePartnershipScores(delta, teams)), 0) === 0;
}

export function calculateTrixRound(
  input: TrixRoundInput,
  players: GamePlayer[],
  rules: TrixRules,
  teams?: GameTeam[]
): Record<string, number> {
  const result = emptyScores(players);
  switch (input.contract) {
    case 'king':
      return scoreKingOfHearts(input.selectedTeamId ?? input.selectedPlayerId ?? '', input.doubledByPlayerId, players, rules, teams);
    case 'queens':
      if (input.queens) return scoreQueens(input.queens, players, rules, teams);
      players.forEach((player) => (result[player.id] = (input.counts?.[player.id] ?? 0) * rules.queenPenalty));
      break;
    case 'diamonds':
      Object.entries(input.counts).forEach(([id, count]) => addTargetScore(result, id, count * rules.diamondPenalty, players, teams));
      break;
    case 'tricks':
      Object.entries(input.counts).forEach(([id, count]) => addTargetScore(result, id, count * rules.trickPenalty, players, teams));
      break;
    case 'trix':
      input.order.forEach((playerId, index) => (result[playerId] = rules.trixRanks[index]));
      break;
    case 'complex':
      if (Array.isArray(input.queens)) {
        const king = scoreKingOfHearts(input.kingTeamId ?? input.kingPlayerId ?? '', input.kingDoubledByPlayerId, players, rules, teams);
        const queenScores = scoreQueens(input.queens, players, rules, teams);
        const diamondScores = emptyScores(players); Object.entries(input.diamonds).forEach(([id, count]) => addTargetScore(diamondScores, id, count * rules.diamondPenalty, players, teams));
        const trickScores = emptyScores(players); Object.entries(input.tricks).forEach(([id, count]) => addTargetScore(trickScores, id, count * rules.trickPenalty, players, teams));
        players.forEach((player) => {
          const id = player.id;
          result[id] = king[id] + queenScores[id] + diamondScores[id] + trickScores[id];
        });
        break;
      }
      {
      const queenCounts = input.queens as Record<string, number>;
      players.forEach((player) => {
        const id = player.id;
        result[id] =
          (id === input.kingPlayerId ? rules.kingPenalty : 0) +
          (queenCounts[id] ?? 0) * rules.queenPenalty +
          (input.diamonds[id] ?? 0) * rules.diamondPenalty +
          (input.tricks[id] ?? 0) * rules.trickPenalty;
      });
      }
  }
  return result;
}

export function validateTrixInput(input: TrixRoundInput, rules: TrixRules): boolean {
  const sum = (record: Record<string, number>) => Object.values(record).reduce((total, value) => total + value, 0);
  if (input.contract === 'king') return Boolean(input.selectedPlayerId) && (!input.doubled || Boolean(input.doubledByPlayerId));
  if (input.contract === 'queens') {
    if (input.queens) return validateQueenEntities(input.queens, rules);
    return Boolean(input.counts) && sum(input.counts!) === rules.queenCount;
  }
  if (input.contract === 'diamonds') return sum(input.counts) === rules.diamondCount;
  if (input.contract === 'tricks') return sum(input.counts) === rules.trickCount;
  if (input.contract === 'trix') return new Set(input.order).size === 4;
  const queensValid = Array.isArray(input.queens) ? validateQueenEntities(input.queens, rules) : sum(input.queens) === rules.queenCount;
  return (
    Boolean(input.kingTeamId ?? input.kingPlayerId) &&
    (!input.kingDoubled || Boolean(input.kingDoubledByPlayerId)) &&
    queensValid &&
    sum(input.diamonds) === rules.diamondCount &&
    sum(input.tricks) === rules.trickCount
  );
}

function validateQueenEntities(queens: DoubledQueenResult[], rules: TrixRules) {
  return queens.length === rules.queenCount && queens.every((queen) =>
    Boolean(queen.id && (queen.takenByTeamId ?? queen.takenByPlayerId)) && (!queen.doubled || Boolean(queen.doubledByPlayerId))
  );
}
