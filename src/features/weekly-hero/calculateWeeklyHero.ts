import type { GameRound, GameSession, LashRoundInput, LikhaRoundInput, Tarneeb41RoundInput, TrixRankingInput } from '../../types';
import { calculateLikhaRound } from '../../games/likha/engine';
import { buildTarneeb61Attempts } from '../../games/tarneeb/analytics';
import { didPlayerWin, getLocalWeekBounds, isCompletedGameInWeek, type WeekBounds } from '../weekly/weekWindow';

export const WEEKLY_HERO_WEIGHTS = {
  gameWin: 8,
  gameLoss: -3,
  tarneeb61Success: 4,
  tarneeb61HighBidPerLevel: 2,
  tarneeb61Kaboot: 12,
  tarneeb61Failure: -6,
  tarneeb61HighFailure: -8,
  brokenSeven: -10,
  successStreakThree: 4,
  successStreakExtra: 2,
  tarneeb41Success: 3,
  tarneeb41HighSuccess: 3,
  tarneeb41Failure: -4,
  tarneeb41BigFailure: -8,
  likhaTen: 4,
  likhaTenDoubled: 8,
  likhaQueen: -6,
  likhaQueenDoubled: -12,
  likhaKing: -4,
  likhaKingDoubled: -8,
  likhaJack: -3,
  likhaJackDoubled: -6,
  likhaDisasterRound: -8,
  trixFirst: 5,
  trixLast: -4,
  oldMan: -4,
  oldManDoubled: -8
} as const;

export type WeeklyHeroCounters = {
  wins: number;
  losses: number;
  contracts: number;
  successfulContracts: number;
  failedContracts: number;
  highSuccessfulContracts: number;
  kaboots: number;
  longestSuccessStreak: number;
  tenDiamonds: number;
  doubledTens: number;
  bestLikhaRound?: number;
  trixFirst: number;
};

export type WeeklyHeroPlayerStats = {
  profileId: string;
  name: string;
  completedGames: number;
  heroScore: number;
  heroEvents: number;
  catastrophicMistakes: number;
  successRate?: number;
  counters: WeeklyHeroCounters;
  reasons: string[];
  awards: string[];
};

export type WeeklyHeroResult = { bounds: WeekBounds; eligible: WeeklyHeroPlayerStats[]; winners: WeeklyHeroPlayerStats[] };

const blankCounters = (): WeeklyHeroCounters => ({ wins: 0, losses: 0, contracts: 0, successfulContracts: 0, failedContracts: 0, highSuccessfulContracts: 0, kaboots: 0, longestSuccessStreak: 0, tenDiamonds: 0, doubledTens: 0, trixFirst: 0 });

function buildReasons(counters: WeeklyHeroCounters) {
  const reasons: string[] = [];
  if (counters.wins) reasons.push(`🔥 فاز ${counters.wins} ${counters.wins === 1 ? 'قعدة' : 'قعدات'}.`);
  if (counters.contracts) reasons.push(`🎯 نجح بـ${counters.successfulContracts} ضمانات من ${counters.contracts}.`);
  if (counters.highSuccessfulContracts) reasons.push(`💪 نجح بـ${counters.highSuccessfulContracts} ضمانات ثقيلة.`);
  if (counters.kaboots) reasons.push(`✌️ جاب كبوت ${counters.kaboots} مرة.`);
  if (counters.longestSuccessStreak >= 3) reasons.push(`🐺 أطول سلسلة نجاح: ${counters.longestSuccessStreak}.`);
  if (counters.tenDiamonds) reasons.push(`♦ شفط 10 الديناري ${counters.tenDiamonds} مرة${counters.doubledTens ? `، ${counters.doubledTens} مدبلة` : ''}.`);
  if (counters.bestLikhaRound !== undefined) reasons.push(`📈 أفضل جولة ليخة: ${counters.bestLikhaRound}.`);
  if (counters.trixFirst) reasons.push(`🏁 حلّ أول بالتركس ${counters.trixFirst} مرة.`);
  return reasons;
}

function buildAwards(counters: WeeklyHeroCounters) {
  const awards: string[] = [];
  const rate = counters.contracts ? counters.successfulContracts / counters.contracts * 100 : 0;
  if (counters.successfulContracts >= 3 && rate >= 75) awards.push('🎯 ملك الضمان');
  if (counters.kaboots) awards.push('✌️ صاحب الكبوت');
  if (counters.wins >= 3) awards.push('🔥 جلاد الطاولة');
  if (counters.longestSuccessStreak >= 3) awards.push('🐺 وحش السلسلة');
  if (counters.tenDiamonds >= 2) awards.push('♦ صياد العشرة');
  return awards;
}

export function calculateWeeklyHeroPlayerStats(games: GameSession[], rounds: GameRound[], bounds: WeekBounds): WeeklyHeroPlayerStats[] {
  const relevant = games.filter((game) => isCompletedGameInWeek(game, bounds));
  const stats = new Map<string, WeeklyHeroPlayerStats>();
  const roundsByGame = new Map<string, GameRound[]>();
  rounds.forEach((round) => roundsByGame.set(round.gameId, [...(roundsByGame.get(round.gameId) ?? []), round]));
  const find = (game: GameSession, playerId: string) => {
    const player = game.players.find((entry) => entry.id === playerId);
    if (!player?.profileId) return undefined;
    const item = stats.get(player.profileId) ?? { profileId: player.profileId, name: player.name, completedGames: 0, heroScore: 0, heroEvents: 0, catastrophicMistakes: 0, counters: blankCounters(), reasons: [], awards: [] };
    item.name = player.name;
    stats.set(player.profileId, item);
    return item;
  };
  const add = (item: WeeklyHeroPlayerStats | undefined, points: number, heroEvent = false, catastrophic = false) => {
    if (!item) return;
    item.heroScore += points;
    if (heroEvent) item.heroEvents += 1;
    if (catastrophic) item.catastrophicMistakes += 1;
  };

  relevant.forEach((game) => {
    game.players.forEach((player) => {
      const item = find(game, player.id);
      if (!item) return;
      item.completedGames += 1;
      if (didPlayerWin(game, player.id)) { item.counters.wins += 1; add(item, WEEKLY_HERO_WEIGHTS.gameWin); }
      else { item.counters.losses += 1; add(item, WEEKLY_HERO_WEIGHTS.gameLoss); }
    });
    const gameRounds = (roundsByGame.get(game.id) ?? []).sort((a, b) => a.index - b.index);

    if (game.gameType === 'tarneeb-61') {
      const streak = new Map<string, number>();
      buildTarneeb61Attempts(game, gameRounds).forEach((attempt) => {
        const item = find(game, attempt.playerId);
        if (!item) return;
        item.counters.contracts += 1;
        if (attempt.succeeded) {
          item.counters.successfulContracts += 1;
          add(item, WEEKLY_HERO_WEIGHTS.tarneeb61Success, true);
          if (attempt.bid >= 10) { item.counters.highSuccessfulContracts += 1; add(item, (attempt.bid - 9) * WEEKLY_HERO_WEIGHTS.tarneeb61HighBidPerLevel, true); }
          if (attempt.actualTricks === 13) { item.counters.kaboots += 1; add(item, WEEKLY_HERO_WEIGHTS.tarneeb61Kaboot, true); }
          const run = (streak.get(attempt.playerId) ?? 0) + 1;
          streak.set(attempt.playerId, run);
          item.counters.longestSuccessStreak = Math.max(item.counters.longestSuccessStreak, run);
          if (run === 3) add(item, WEEKLY_HERO_WEIGHTS.successStreakThree, true);
          else if (run > 3) add(item, WEEKLY_HERO_WEIGHTS.successStreakExtra, true);
        } else {
          streak.set(attempt.playerId, 0);
          item.counters.failedContracts += 1;
          const points = attempt.bid === 7 ? WEEKLY_HERO_WEIGHTS.brokenSeven : attempt.bid >= 10 ? WEEKLY_HERO_WEIGHTS.tarneeb61HighFailure : WEEKLY_HERO_WEIGHTS.tarneeb61Failure;
          add(item, points, false, attempt.bid === 7 || attempt.bid >= 10);
        }
      });
    }

    if (game.gameType === 'tarneeb-41') gameRounds.filter((round) => round.type === 'tarneeb-41').forEach((round) => {
      (round.input as Tarneeb41RoundInput).entries.forEach((entry) => {
        const item = find(game, entry.playerId);
        if (!item) return;
        item.counters.contracts += 1;
        if (entry.success) {
          item.counters.successfulContracts += 1;
          add(item, WEEKLY_HERO_WEIGHTS.tarneeb41Success, true);
          if (entry.bid >= 7) { item.counters.highSuccessfulContracts += 1; add(item, WEEKLY_HERO_WEIGHTS.tarneeb41HighSuccess, true); }
        } else {
          item.counters.failedContracts += 1;
          add(item, entry.bid >= 9 ? WEEKLY_HERO_WEIGHTS.tarneeb41BigFailure : WEEKLY_HERO_WEIGHTS.tarneeb41Failure, false, entry.bid >= 9);
        }
      });
    });

    if (game.gameType === 'likha') gameRounds.filter((round) => round.type === 'likha').forEach((round) => {
      const input = round.input as LikhaRoundInput;
      const delta = calculateLikhaRound(input, game.players.map((player) => player.id), game.teams);
      Object.entries(delta).forEach(([playerId, score]) => {
        const item = find(game, playerId);
        if (!item) return;
        item.counters.bestLikhaRound = Math.max(item.counters.bestLikhaRound ?? score, score);
        if (score <= -30) add(item, WEEKLY_HERO_WEIGHTS.likhaDisasterRound, false, true);
      });
      const { queenSpades, kingClubs, jackDiamonds, tenDiamonds } = input.specialCards;
      add(find(game, queenSpades.capturedBy), queenSpades.doubled ? WEEKLY_HERO_WEIGHTS.likhaQueenDoubled : WEEKLY_HERO_WEIGHTS.likhaQueen, false, queenSpades.doubled);
      add(find(game, kingClubs.capturedBy), kingClubs.doubled ? WEEKLY_HERO_WEIGHTS.likhaKingDoubled : WEEKLY_HERO_WEIGHTS.likhaKing, false, kingClubs.doubled);
      add(find(game, jackDiamonds.capturedBy), jackDiamonds.doubled ? WEEKLY_HERO_WEIGHTS.likhaJackDoubled : WEEKLY_HERO_WEIGHTS.likhaJack, false, jackDiamonds.doubled);
      const tenOwner = find(game, tenDiamonds.capturedBy);
      if (tenOwner) { tenOwner.counters.tenDiamonds += 1; if (tenDiamonds.doubled) tenOwner.counters.doubledTens += 1; add(tenOwner, tenDiamonds.doubled ? WEEKLY_HERO_WEIGHTS.likhaTenDoubled : WEEKLY_HERO_WEIGHTS.likhaTen, true); }
    });

    if (game.gameType === 'cc' || game.gameType === 'trix-fast') gameRounds.forEach((round) => {
      if (round.type === 'trix-ranking') {
        const order = (round.input as TrixRankingInput).finishingOrder;
        const first = find(game, order[0]); if (first) { first.counters.trixFirst += 1; add(first, WEEKLY_HERO_WEIGHTS.trixFirst, true); }
        add(find(game, order[3]), WEEKLY_HERO_WEIGHTS.trixLast);
      }
      if (round.type === 'lash') {
        const input = round.input as LashRoundInput;
        add(find(game, input.oldMan.eaterPlayerId), input.oldMan.doubled ? WEEKLY_HERO_WEIGHTS.oldManDoubled : WEEKLY_HERO_WEIGHTS.oldMan, false, input.oldMan.doubled);
      }
    });
  });

  return [...stats.values()].map((item) => {
    const bestLikhaBonus = item.counters.bestLikhaRound !== undefined && item.counters.bestLikhaRound >= 0 ? Math.min(6, 2 + Math.floor(item.counters.bestLikhaRound / 5)) : 0;
    const successRate = item.counters.contracts ? item.counters.successfulContracts / item.counters.contracts * 100 : undefined;
    return { ...item, heroScore: item.heroScore + bestLikhaBonus, successRate, reasons: buildReasons(item.counters), awards: buildAwards(item.counters) };
  });
}

export function calculateWeeklyHeroScore(stats: WeeklyHeroPlayerStats) { return stats.heroScore; }

export function selectWeeklyHero(players: WeeklyHeroPlayerStats[], minimumCompletedGames = 2): WeeklyHeroPlayerStats[] {
  const rate = (player: WeeklyHeroPlayerStats) => player.counters.contracts >= 3 ? player.successRate ?? 0 : -1;
  const eligible = players.filter((player) => player.completedGames >= minimumCompletedGames && player.heroScore > 0).sort((a, b) => b.heroScore - a.heroScore || b.counters.wins - a.counters.wins || b.heroEvents - a.heroEvents || rate(b) - rate(a) || a.catastrophicMistakes - b.catastrophicMistakes || a.profileId.localeCompare(b.profileId));
  const first = eligible[0];
  if (!first) return [];
  return eligible.filter((player) => player.heroScore === first.heroScore && player.counters.wins === first.counters.wins && player.heroEvents === first.heroEvents && rate(player) === rate(first) && player.catastrophicMistakes === first.catastrophicMistakes);
}

export function calculateWeeklyHero(games: GameSession[], rounds: GameRound[], bounds = getLocalWeekBounds()): WeeklyHeroResult {
  const stats = calculateWeeklyHeroPlayerStats(games, rounds, bounds);
  return { bounds, eligible: stats.filter((player) => player.completedGames >= 2), winners: selectWeeklyHero(stats) };
}
