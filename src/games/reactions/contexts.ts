import type { GamePlayer, GameRound, GameSession, LashRoundInput, TarneebRoundInput, TrixRankingInput } from '../../types';
import type { Tarneeb61Attempt } from '../tarneeb/analytics';
import type { TarneebRoundResult } from '../tarneeb/scoring';
import { ownerForKingdom, partnerForPlayer, partnershipLashScores, teamForPlayer, trixRankingDelta } from '../fast/scoring';
import type { ConditionalReactionContext } from './conditionalRules';

const profileId = (game: GameSession, playerId?: string) => game.players.find((player) => player.id === playerId)?.profileId;
const participantProfileIds = (game: GameSession) => game.players.map((player) => player.profileId).filter((id): id is string => Boolean(id));
const teamProfileIds = (game: GameSession, teamId?: string) => game.teams?.find((team) => team.id === teamId)?.playerIds.map((id) => profileId(game, id)).filter((id): id is string => Boolean(id)) ?? [];

function lashScores(input: LashRoundInput, game: GameSession) {
  if (input.kind === 'lash-partnership' || input.kind === 'lash-partnership-fixed-total') return partnershipLashScores(input, game.teams ?? []);
  return input.scoresByPlayer;
}

function streak(values: number[], predicate: (value: number) => boolean): number {
  let count = 0; for (const value of values) { if (!predicate(value)) break; count += 1; } return count;
}

function fastBase(game: GameSession, owner: GamePlayer, event: ConditionalReactionContext['event'], roundIndex: number, intensity: 1 | 2 | 3 | 4): Omit<ConditionalReactionContext, 'values' | 'placeholders'> {
  const ownerTeam = teamForPlayer(owner.id, game.teams); const opponentTeam = game.teams?.find((team) => team.id !== ownerTeam?.id);
  return { gameId: game.id, game: game.gameType as 'trix-fast' | 'cc', event, roundIndex, intensity, participantProfileIds: participantProfileIds(game), ownerTeamProfileIds: teamProfileIds(game, ownerTeam?.id), opponentTeamProfileIds: teamProfileIds(game, opponentTeam?.id) };
}

export function buildLashConditionalContext(game: GameSession, rounds: GameRound[], input: LashRoundInput, owner: GamePlayer, kingdomIndex: number, intensity: 1 | 2 | 3 | 4): ConditionalReactionContext {
  const scores = lashScores(input, game); const ownerTeam = teamForPlayer(owner.id, game.teams); const opponentTeam = game.teams?.find((team) => team.id !== ownerTeam?.id);
  const opponent = game.players.find((player) => opponentTeam?.playerIds.includes(player.id));
  const ownerScore = game.trixMode === 'partnership' ? scores[ownerTeam?.id ?? ''] : scores[owner.id];
  const previousScores = rounds.filter((round) => round.type === 'lash').reverse().map((round) => { const previous = lashScores(round.input as LashRoundInput, game); return game.trixMode === 'partnership' ? previous[ownerTeam?.id ?? ''] : previous[owner.id]; }).filter((value): value is number => typeof value === 'number');
  const sequence = [ownerScore, ...previousScores];
  return {
    ...fastBase(game, owner, 'lash', rounds.length, intensity),
    values: {
      gameMode: game.trixMode === 'partnership' ? 'partnership' : 'solo', kingdomNumber: kingdomIndex + 1, ownerProfileId: profileId(game, owner.id),
      enteredTeamScore: input.kind === 'lash-partnership-fixed-total' ? input.enteredScore : undefined,
      ownerTeamScore: game.trixMode === 'partnership' ? ownerScore : undefined, opponentTeamScore: game.trixMode === 'partnership' ? scores[opponentTeam?.id ?? ''] : undefined,
      soloPlayerScore: game.trixMode !== 'partnership' ? ownerScore : undefined, badLashStreak: streak(sequence, (value) => value <= -250), goodLashStreak: streak(sequence, (value) => value > -100)
    },
    placeholders: { player: owner.name, owner: owner.name, partner: game.players.find((player) => player.id === partnerForPlayer(owner.id, game.teams))?.name ?? 'صاحبنا', team: ownerTeam?.name ?? owner.name, opponent: opponent?.name ?? 'الخصم', opponentTeam: opponentTeam?.name ?? 'باقي الطاولة', score: ownerScore, absScore: Math.abs(ownerScore), kingdom: kingdomIndex + 1 }
  };
}

export function buildOldManConditionalContext(game: GameSession, rounds: GameRound[], input: LashRoundInput, owner: GamePlayer, kingdomIndex: number, intensity: 1 | 2 | 3 | 4, historicalRecord = false): ConditionalReactionContext {
  const eater = game.players.find((player) => player.id === input.oldMan.eaterPlayerId)!; const ownerTeam = teamForPlayer(owner.id, game.teams); const eaterTeam = teamForPlayer(eater.id, game.teams);
  const role = eater.id === owner.id ? 'owner' : ownerTeam && eaterTeam?.id === ownerTeam.id ? 'partner' : 'opponent';
  const previous = rounds.filter((round) => round.type === 'lash').map((round) => (round.input as LashRoundInput).oldMan).filter((oldMan) => oldMan.eaterPlayerId === eater.id);
  const oldManCount = previous.length + 1; const doubledOldManCount = previous.filter((oldMan) => oldMan.doubled).length + Number(input.oldMan.doubled);
  const ownerPartner = game.players.find((player) => player.id === partnerForPlayer(owner.id, game.teams)); const opponentTeam = game.teams?.find((team) => team.id !== ownerTeam?.id);
  const opponent = game.players.find((player) => opponentTeam?.playerIds.includes(player.id));
  return {
    ...fastBase(game, owner, 'old-man', rounds.length, intensity), actorProfileId: eater.profileId,
    values: {
      gameMode: game.trixMode === 'partnership' ? 'partnership' : 'solo', kingdomNumber: kingdomIndex + 1, ownerProfileId: profileId(game, owner.id), oldManRole: role,
      oldManDoubled: input.oldMan.doubled, ownerAteOldMan: eater.id === owner.id, ownerAteDoubledOldMan: eater.id === owner.id && input.oldMan.doubled,
      playerAteOwnKingdom: eater.id === owner.id, oldManCount, doubledOldManCount, targetProfileId: eater.profileId, historicalOldManRecord: historicalRecord
    },
    placeholders: { player: eater.name, owner: owner.name, partner: ownerPartner?.name ?? 'صاحبنا', team: ownerTeam?.name ?? owner.name, opponent: opponent?.name ?? 'الخصم', opponentTeam: opponentTeam?.name ?? 'باقي الطاولة', oldManCount, kingdom: kingdomIndex + 1 }
  };
}

export function buildTrixConditionalContext(game: GameSession, rounds: GameRound[], input: TrixRankingInput, owner: GamePlayer, kingdomIndex: number, intensity: 1 | 2 | 3 | 4): ConditionalReactionContext {
  const points = trixRankingDelta(input.finishingOrder, game.players); const partnerId = partnerForPlayer(owner.id, game.teams); const ownerPosition = input.finishingOrder.indexOf(owner.id) + 1; const partnerPosition = partnerId ? input.finishingOrder.indexOf(partnerId) + 1 : 0;
  const ownerTeam = teamForPlayer(owner.id, game.teams); const opponentTeam = game.teams?.find((team) => team.id !== ownerTeam?.id);
  const opponent = game.players.find((player) => opponentTeam?.playerIds.includes(player.id));
  const previousPositions = rounds.filter((round) => round.type === 'trix-ranking').reverse().map((round) => (round.input as TrixRankingInput).finishingOrder.indexOf(owner.id) + 1).filter((position) => position > 0);
  const positions = [ownerPosition, ...previousPositions];
  const profilePositions = Object.fromEntries(input.finishingOrder.map((playerId, index) => [profileId(game, playerId), index + 1]).filter(([id]) => Boolean(id))) as Record<string, number>;
  return {
    ...fastBase(game, owner, 'trix', rounds.length, intensity), profilePositions,
    values: {
      gameMode: game.trixMode === 'partnership' ? 'partnership' : 'solo', kingdomNumber: kingdomIndex + 1, ownerProfileId: profileId(game, owner.id), ownerPosition, partnerPosition,
      ownerTrixPoints: points[owner.id], partnerTrixPoints: partnerId ? points[partnerId] : undefined, teamTrixTotal: ownerTeam?.playerIds.reduce((sum, id) => sum + points[id], 0),
      ownerAheadPartner: ownerPosition < partnerPosition, partnerAheadOwner: partnerPosition < ownerPosition, ownerFirst: ownerPosition === 1, ownerLast: ownerPosition === 4,
      partnerFirst: partnerPosition === 1, partnerLast: partnerPosition === 4, pairCombination: `${points[owner.id]}:${partnerId ? points[partnerId] : 0}`,
      trixFirstStreak: streak(positions, (position) => position === 1), trixFourthStreak: streak(positions, (position) => position === 4)
    },
    placeholders: { player: owner.name, owner: owner.name, partner: game.players.find((player) => player.id === partnerId)?.name ?? 'صاحبنا', team: ownerTeam?.name ?? owner.name, opponent: opponent?.name ?? 'الخصم', opponentTeam: opponentTeam?.name ?? 'باقي الطاولة', position: ownerPosition, score: points[owner.id], absScore: Math.abs(points[owner.id]), kingdom: kingdomIndex + 1 }
  };
}

export function buildTarneebConditionalContext(game: GameSession, savedRound: GameRound, input: TarneebRoundInput, result: TarneebRoundResult, attempts: Tarneeb61Attempt[], intensity: 1 | 2 | 3 | 4): ConditionalReactionContext {
  const bidder = game.players.find((player) => player.id === input.bidderId)!; const team = game.teams?.find((candidate) => candidate.id === input.bidderTeamId); const opponent = game.teams?.find((candidate) => candidate.id !== team?.id);
  const partner = game.players.find((player) => player.id !== bidder.id && team?.playerIds.includes(player.id)); const opponentPlayer = game.players.find((player) => opponent?.playerIds.includes(player.id));
  const bidderAttempts = attempts.filter((attempt) => attempt.playerId === bidder.id); let successStreak = 0; let failureStreak = 0;
  for (let index = bidderAttempts.length - 1; index >= 0; index -= 1) { if (bidderAttempts[index].succeeded) { if (failureStreak) break; successStreak += 1; } else { if (successStreak) break; failureStreak += 1; } }
  const actualTricks = input.bidderTeamId === game.teams?.[0].id ? input.teamOneTricks : 13 - input.teamOneTricks;
  const target = game.rulesSnapshot.kind === 'tarneeb-61-v2' ? game.rulesSnapshot.rules.targetScore : 61; const currentTeamScore = savedRound.scoreAfter[team?.id ?? ''] ?? 0; const opponentScore = savedRound.scoreAfter[opponent?.id ?? ''] ?? 0;
  return {
    gameId: game.id, game: 'tarneeb-61', event: 'tarneeb', roundIndex: savedRound.index, intensity, actorProfileId: bidder.profileId, participantProfileIds: participantProfileIds(game), ownerTeamProfileIds: teamProfileIds(game, team?.id), opponentTeamProfileIds: teamProfileIds(game, opponent?.id),
    values: { targetProfileId: bidder.profileId, bid: input.bid, actualTricks, succeeded: result.contractSucceeded, failed: !result.contractSucceeded, isKaboot: result.contractSucceeded && actualTricks === 13, brokenSeven: !result.contractSucceeded && input.bid === 7, failureStreak, successStreak, kabootCount: bidderAttempts.filter((attempt) => attempt.succeeded && attempt.actualTricks === 13).length, currentTeamScore, opponentScore, matchTarget: target, remainingToTarget: Math.max(0, target - currentTeamScore) },
    placeholders: { player: bidder.name, owner: bidder.name, partner: partner?.name ?? 'الشريك', team: team?.name ?? 'الفريق', opponent: opponentPlayer?.name ?? 'الخصم', opponentTeam: opponent?.name ?? 'الخصم', bid: input.bid, actualTricks, target, remaining: Math.max(0, target - currentTeamScore), score: currentTeamScore, absScore: Math.abs(currentTeamScore) }
  };
}

export function ownerAtKingdom(game: GameSession, kingdomIndex: number): GamePlayer { return ownerForKingdom(game, kingdomIndex); }
