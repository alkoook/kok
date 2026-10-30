import type { GameTeam } from '../../types';
import type { LikhaRanking, LikhaRoundInput, LikhaSpecialCard } from './types';

export const LIKHA_CARD_VALUES: Record<LikhaSpecialCard, number> = {
  jackDiamonds: -11,
  queenSpades: -13,
  kingClubs: -14,
  tenDiamonds: 10
};

export type LikhaValidation = { valid: boolean; errors: string[] };

export function complementaryLikhaHearts(enteredHearts: number): number {
  if (!Number.isInteger(enteredHearts) || enteredHearts < 0 || enteredHearts > 13) throw new Error('عدد الكوبا يجب أن يكون بين 0 و13');
  return 13 - enteredHearts;
}

function partnershipHearts(input: LikhaRoundInput, teams: GameTeam[]) {
  const partnership = input.partnership!;
  const opponent = teams.find((team) => team.id !== partnership.enteredTeamId);
  if (!opponent) return {};
  return { [partnership.enteredTeamId]: partnership.enteredTeamHearts, [opponent.id]: complementaryLikhaHearts(partnership.enteredTeamHearts) };
}

export function validateLikhaRound(input: LikhaRoundInput, playerIds: string[], teams: GameTeam[] = []): LikhaValidation {
  const errors: string[] = [];
  const allowed = new Set(playerIds);
  const captureIds = input.players.map((entry) => entry.playerId);
  const hearts = input.players.reduce((sum, entry) => sum + entry.heartsCount, 0);
  if (playerIds.length !== 4 || input.players.length !== 4 || new Set(captureIds).size !== 4 || captureIds.some((id) => !allowed.has(id))) errors.push('يجب تسجيل أربعة لاعبين مختلفين');
  if (input.players.some((entry) => !Number.isInteger(entry.heartsCount) || entry.heartsCount < 0 || entry.heartsCount > 13)) errors.push('عدد الكوبا يجب أن يكون عددًا صحيحًا بين 0 و13');
  if (input.partnership) {
    const teamIds = new Set(teams.map((team) => team.id));
    if (teams.length !== 2 || !teamIds.has(input.partnership.enteredTeamId)) errors.push('يجب تحديد الفريق الذي أُدخلت له الكوبا');
    try { complementaryLikhaHearts(input.partnership.enteredTeamHearts); } catch (error) { errors.push((error as Error).message); }
    for (const card of Object.keys(input.specialCards) as LikhaSpecialCard[]) {
      const teamId = input.partnership.cardTeams[card];
      const team = teams.find((entry) => entry.id === teamId);
      if (!team) errors.push(`يجب تحديد الفريق صاحب ${card}`);
      const owner = input.specialCards[card].capturedBy;
      if (owner && !team?.playerIds.includes(owner)) errors.push(`صاحب ${card} يجب أن يكون من الفريق المحدد`);
    }
  } else if (hearts !== 13) errors.push(`مجموع الكوبا يجب أن يساوي 13 (الحالي ${hearts})`);
  for (const [card, capture] of Object.entries(input.specialCards)) {
    if (!input.partnership && (!capture?.capturedBy || !allowed.has(capture.capturedBy))) errors.push(`يجب تحديد صاحب ${card}`);
    if (input.partnership && capture?.capturedBy && !allowed.has(capture.capturedBy)) errors.push(`صاحب ${card} غير صالح`);
    if (typeof capture?.doubled !== 'boolean') errors.push(`حالة تدبيل ${card} غير صالحة`);
  }
  return { valid: errors.length === 0, errors };
}

export function calculateLikhaRound(input: LikhaRoundInput, playerIds: string[], teams: GameTeam[] = []): Record<string, number> {
  const validation = validateLikhaRound(input, playerIds, teams);
  if (!validation.valid) throw new Error(validation.errors[0]);
  return previewLikhaRound(input, playerIds, teams);
}

/** A non-throwing preview used by the entry UI; final saves still require validation. */
export function previewLikhaRound(input: LikhaRoundInput, playerIds: string[], teams: GameTeam[] = []): Record<string, number> {
  if (input.partnership && teams.length === 2) {
    const hearts = partnershipHearts(input, teams);
    const delta = Object.fromEntries(teams.map((team) => [team.id, -(hearts[team.id] ?? 0)]));
    (Object.entries(input.specialCards) as [LikhaSpecialCard, LikhaRoundInput['specialCards'][LikhaSpecialCard]][]).forEach(([card, capture]) => {
      const teamId = input.partnership!.cardTeams[card];
      if (teamId in delta) delta[teamId] += LIKHA_CARD_VALUES[card] * (capture.doubled ? 2 : 1);
    });
    return delta;
  }
  const delta = Object.fromEntries(playerIds.map((id) => [id, 0]));
  input.players.forEach((entry) => { delta[entry.playerId] = -entry.heartsCount; });
  (Object.entries(input.specialCards) as [LikhaSpecialCard, LikhaRoundInput['specialCards'][LikhaSpecialCard]][]).forEach(([card, capture]) => {
    if (capture.capturedBy in delta) delta[capture.capturedBy] += LIKHA_CARD_VALUES[card] * (capture.doubled ? 2 : 1);
  });
  return delta;
}

export function calculateLikhaTotals(playerIds: string[], rounds: LikhaRoundInput[]): Record<string, number> {
  return rounds.reduce((totals, round) => {
    const delta = calculateLikhaRound(round, playerIds);
    playerIds.forEach((id) => { totals[id] += delta[id] ?? 0; });
    return totals;
  }, Object.fromEntries(playerIds.map((id) => [id, 0])) as Record<string, number>);
}

/** Player scores remain the single source of truth; official partnership scores are derived. */
export function aggregateLikhaTeamScores(playerScores: Record<string, number>, teams: GameTeam[]): Record<string, number> {
  return Object.fromEntries(teams.map((team) => [team.id, (playerScores[team.id] ?? 0) + team.playerIds.reduce((sum, playerId) => sum + (playerScores[playerId] ?? 0), 0)]));
}

export const calculateLikhaTeamRound = aggregateLikhaTeamScores;
export const calculateLikhaTeamTotals = aggregateLikhaTeamScores;

export function isLikhaPartnershipFinished(playerScores: Record<string, number>, teams: GameTeam[], lossLimit = 210) {
  return isLikhaGameFinished(aggregateLikhaTeamScores(playerScores, teams), lossLimit);
}

export const isLikhaGameFinished = (scores: Record<string, number>, lossLimit = 210) =>
  Object.values(scores).some((score) => score <= -Math.abs(lossLimit));

export function rankLikhaPlayers(scores: Record<string, number>): LikhaRanking[] {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const best = sorted[0]?.[1];
  let previous: number | undefined; let rank = 0;
  return sorted.map(([playerId, score], index) => {
    if (score !== previous) rank = index + 1;
    previous = score;
    return { playerId, score, rank, winner: score === best };
  });
}
