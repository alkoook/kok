import type { GamePlayer, GameTeam, Tarneeb41Phase, Tarneeb41PlayerRoundInput, Tarneeb41PlayerRoundResult, Tarneeb41RoundInput, Tarneeb41RulesV2, Tarneeb61RulesV2, TarneebRoundInput, TarneebScoringRules } from '../../types';

export type TarneebRoundResult = { delta: Record<string, number>; contractSucceeded: boolean };

const configuredValue = (value: number | undefined) => (Number.isInteger(value) ? value! : 0);

export function calculateTarneebRound(
  input: TarneebRoundInput,
  teamIds: [string, string],
  rules: TarneebScoringRules
): TarneebRoundResult {
  const [teamOneId, teamTwoId] = teamIds;
  const teamOneTricks = input.teamOneTricks;
  const teamTwoTricks = 13 - teamOneTricks;
  const bidderIsTeamOne = input.bidderTeamId === teamOneId;
  const bidderTricks = bidderIsTeamOne ? teamOneTricks : teamTwoTricks;
  const opponentsTricks = bidderIsTeamOne ? teamTwoTricks : teamOneTricks;
  const contractSucceeded = bidderTricks >= input.bid;

  let bidderDelta: number;
  let opponentsDelta: number;
  if (contractSucceeded) {
    bidderDelta = rules.scoringOnSuccessfulBid === 'actual-tricks' ? bidderTricks : input.bid;
    if (rules.enableKaboot && bidderTricks === 13) bidderDelta = configuredValue(rules.kabootValue);
    opponentsDelta =
      rules.opponentsScoreOnBidSuccess === 'actual-tricks'
        ? opponentsTricks
        : rules.opponentsScoreOnBidSuccess === 'zero'
          ? 0
          : configuredValue(rules.opponentsSuccessCustomValue);
  } else {
    bidderDelta =
      rules.failedBidPenalty === 'subtract-bid'
        ? -input.bid
        : rules.failedBidPenalty === 'subtract-actual-tricks'
          ? -bidderTricks
          : configuredValue(rules.failedBidCustomValue);
    opponentsDelta =
      rules.opponentsScoreOnBidFailure === 'actual-tricks'
        ? opponentsTricks
        : configuredValue(rules.opponentsFailureValue);
  }

  return {
    delta: bidderIsTeamOne
      ? { [teamOneId]: bidderDelta, [teamTwoId]: opponentsDelta }
      : { [teamOneId]: opponentsDelta, [teamTwoId]: bidderDelta },
    contractSucceeded
  };
}

export function applyScoreDelta(
  current: Record<string, number>,
  delta: Record<string, number>,
  allowNegative = true
): Record<string, number> {
  return Object.fromEntries(
    Object.keys(current).map((id) => [id, allowNegative ? current[id] + (delta[id] ?? 0) : Math.max(0, current[id] + (delta[id] ?? 0))])
  );
}

export function determineTarneebWinner(
  scores: Record<string, number>,
  rules: TarneebScoringRules
): string[] {
  const reached = Object.entries(scores).filter(([, score]) =>
    rules.exactTargetRequired ? score === rules.targetScore : rules.winWhenGreaterOrEqual ? score >= rules.targetScore : score > rules.targetScore
  );
  if (!reached.length) return [];
  const highest = Math.max(...reached.map(([, score]) => score));
  return reached.filter(([, score]) => score === highest).map(([id]) => id);
}

export function validateTarneeb61Round(input: TarneebRoundInput, rules: Tarneeb61RulesV2) {
  return Number.isInteger(input.bid) && input.bid >= rules.minimumBid && input.bid <= rules.maximumBid &&
    Number.isInteger(input.teamOneTricks) && input.teamOneTricks >= 0 && input.teamOneTricks <= 13 && Boolean(input.bidderId && input.bidderTeamId);
}

export function calculateTarneeb61Round(
  input: TarneebRoundInput,
  teamIds: [string, string],
  rules: Tarneeb61RulesV2
): TarneebRoundResult {
  if (!validateTarneeb61Round(input, rules)) throw new Error('نتيجة جولة 61 غير صالحة');
  const [teamOneId, teamTwoId] = teamIds;
  const bidderIsTeamOne = input.bidderTeamId === teamOneId;
  const bidderTricks = bidderIsTeamOne ? input.teamOneTricks : 13 - input.teamOneTricks;
  const opponentTricks = 13 - bidderTricks;
  const contractSucceeded = bidderTricks >= input.bid;
  let bidderDelta: number;
  if (input.bid === 13) bidderDelta = contractSucceeded ? 26 : -26;
  else if (contractSucceeded) bidderDelta = bidderTricks === 13 ? 16 : bidderTricks;
  else bidderDelta = -input.bid;
  const opponentDelta = contractSucceeded ? 0 : opponentTricks;
  return { contractSucceeded, delta: bidderIsTeamOne ? { [teamOneId]: bidderDelta, [teamTwoId]: opponentDelta } : { [teamOneId]: opponentDelta, [teamTwoId]: bidderDelta } };
}

export function deriveTarneeb41Phase(scores: Record<string, number>, teams: GameTeam[]): Tarneeb41Phase {
  const phases = Object.values(deriveTarneeb41PlayerPhases(scores, teams));
  if (phases.includes('blocked-41')) return 'blocked-41';
  if (phases.includes('thirty')) return 'thirty';
  return 'normal';
}

/**
 * The late-game restriction belongs to one partnership, never to the table.
 * It is deliberately derived from current scores so edit/undo can move a side
 * back below 30 without leaving stale state behind.
 */
export function deriveTarneeb41PlayerPhases(scores: Record<string, number>, teams: GameTeam[]): Record<string, Tarneeb41Phase> {
  const phases: Record<string, Tarneeb41Phase> = {};
  teams.forEach((team) => {
    const [first, second] = team.playerIds;
    const blocked = ((scores[first] ?? 0) >= 41 && (scores[second] ?? 0) <= 0) || ((scores[second] ?? 0) >= 41 && (scores[first] ?? 0) <= 0);
    const forcedMinimum = (scores[first] ?? 0) >= 30 || (scores[second] ?? 0) >= 30;
    const phase: Tarneeb41Phase = blocked ? 'blocked-41' : forcedMinimum ? 'thirty' : 'normal';
    phases[first] = phase; phases[second] = phase;
  });
  return phases;
}

export const tarneeb41MinimumBid = (phase: Tarneeb41Phase) => phase === 'normal' ? 2 : phase === 'thirty' ? 3 : 4;

export function tarneeb41ContractValue(bid: number, phase: Tarneeb41Phase) {
  if (phase !== 'normal') return bid;
  if (bid <= 4) return bid;
  if (bid <= 8) return bid * 2;
  return bid * 3;
}

export function scoreTarneeb41Player(entry: Tarneeb41PlayerRoundInput, phase: Tarneeb41Phase): Tarneeb41PlayerRoundResult {
  const contractValue = tarneeb41ContractValue(entry.bid, phase);
  const success = entry.actualTricks >= entry.bid;
  return { ...entry, contractValue, success, scoreDelta: success ? contractValue : -contractValue };
}

export type Tarneeb41BidValidation = { valid: boolean; totalBid: number; remaining: number; reason?: 'player-count' | 'individual-minimum' | 'total-minimum' | 'range' };

type Tarneeb41PhaseInput = Tarneeb41Phase | Record<string, Tarneeb41Phase>;
const phaseForPlayer = (phase: Tarneeb41PhaseInput, playerId: string): Tarneeb41Phase => typeof phase === 'string' ? phase : phase[playerId] ?? 'normal';
const strongestPhase = (phase: Tarneeb41PhaseInput): Tarneeb41Phase => {
  if (typeof phase === 'string') return phase;
  const phases = Object.values(phase);
  return phases.includes('blocked-41') ? 'blocked-41' : phases.includes('thirty') ? 'thirty' : 'normal';
};

export function validateTarneeb41Bids(
  entries: Pick<Tarneeb41PlayerRoundInput, 'playerId' | 'bid'>[],
  phase: Tarneeb41PhaseInput,
  rules: Tarneeb41RulesV2
): Tarneeb41BidValidation {
  const totalBid = entries.reduce((sum, entry) => sum + entry.bid, 0);
  const remaining = Math.max(0, rules.minimumTotalBids - totalBid);
  if (entries.length !== 4 || new Set(entries.map((entry) => entry.playerId)).size !== 4) return { valid: false, totalBid, remaining, reason: 'player-count' };
  if (entries.some((entry) => !Number.isInteger(entry.bid) || entry.bid > rules.maximumBid)) return { valid: false, totalBid, remaining, reason: 'range' };
  if (entries.some((entry) => entry.bid < tarneeb41MinimumBid(phaseForPlayer(phase, entry.playerId)))) return { valid: false, totalBid, remaining, reason: 'individual-minimum' };
  if (totalBid < rules.minimumTotalBids) return { valid: false, totalBid, remaining, reason: 'total-minimum' };
  return { valid: true, totalBid, remaining };
}

export function calculateTarneeb41Round(
  entries: Tarneeb41PlayerRoundInput[],
  phase: Tarneeb41PhaseInput,
  players: GamePlayer[],
  rules: Tarneeb41RulesV2
): { input: Tarneeb41RoundInput; delta: Record<string, number> } {
  const bidValidation = validateTarneeb41Bids(entries, phase, rules);
  const tricksTotal = entries.reduce((sum, entry) => sum + entry.actualTricks, 0);
  if (!bidValidation.valid || tricksTotal !== 13 || entries.some((entry) => !Number.isInteger(entry.actualTricks) || entry.actualTricks < 0 || entry.actualTricks > 13)) {
    throw new Error('نتيجة جولة 41 غير صالحة');
  }
  const results = entries.map((entry) => scoreTarneeb41Player(entry, phaseForPlayer(phase, entry.playerId)));
  const playerIds = new Set(players.map((player) => player.id));
  if (results.some((result) => !playerIds.has(result.playerId))) throw new Error('لاعب غير صالح في جولة 41');
  return { input: { phaseAtRoundStart: strongestPhase(phase), phaseByPlayerId: typeof phase === 'string' ? undefined : { ...phase }, entries: results }, delta: Object.fromEntries(results.map((result) => [result.playerId, result.scoreDelta])) };
}

export function determineTarneeb41Winner(scores: Record<string, number>, teams: GameTeam[]) {
  return teams.filter((team) => {
    const [first, second] = team.playerIds;
    return ((scores[first] ?? 0) >= 41 && (scores[second] ?? 0) > 0) || ((scores[second] ?? 0) >= 41 && (scores[first] ?? 0) > 0);
  }).map((team) => team.id);
}
