import type { GameRound, GameSession, LashRoundInput, LikhaRoundInput, Tarneeb41RoundInput } from '../../types';
import { buildTarneeb61Attempts } from '../../games/tarneeb/analytics';
import { calculateLikhaRound } from '../../games/likha/engine';
import { didPlayerWin, getLocalWeekBounds, isCompletedGameInWeek, type WeekBounds } from '../weekly/weekWindow';

export { getLocalWeekBounds, shiftLocalWeek } from '../weekly/weekWindow';
export type { WeekBounds } from '../weekly/weekWindow';

export const WEEKLY_DONKEY_WEIGHTS = {
  gameLoss: 5, gameWin: -2, tarneeb61Break: 8, brokenSeven: 14, failureStreakThree: 4, failureStreakExtra: 2,
  likhaQueen: 8, likhaQueenDoubled: 16, likhaKing: 6, likhaKingDoubled: 12, likhaJack: 5, likhaJackDoubled: 10,
  heartsPerFour: 1, tenDiamonds: -2, tenDiamondsDoubled: -4, tarneeb41Break: 5, tarneeb41BigBreak: 9,
  oldMan: 4, oldManDoubled: 8, trixLast: 4
} as const;

export type WeeklyCounters = { losses: number; wins: number; tarneeb61Breaks: number; brokenSevens: number; maxBrokenBid: number; queenSpades: number; doubledQueens: number; kingClubs: number; jackDiamonds: number; hearts: number; tenDiamonds: number; worstLikhaRound?: number; oldMan: number; doubledOldMan: number; worstLash?: number; tarneeb41Breaks: number; trixLast: number };
export type WeeklyPlayerStats = { profileId: string; name: string; completedGames: number; donkeyScore: number; catastrophicEvents: number; worstEventSeverity: number; counters: WeeklyCounters; reasons: string[] };
export type WeeklyDonkeyResult = { bounds: WeekBounds; eligible: WeeklyPlayerStats[]; winners: WeeklyPlayerStats[] };

const blankCounters = (): WeeklyCounters => ({ losses: 0, wins: 0, tarneeb61Breaks: 0, brokenSevens: 0, maxBrokenBid: 0, queenSpades: 0, doubledQueens: 0, kingClubs: 0, jackDiamonds: 0, hearts: 0, tenDiamonds: 0, oldMan: 0, doubledOldMan: 0, tarneeb41Breaks: 0, trixLast: 0 });

function reasonLines(counters: WeeklyCounters) {
  const reasons: string[] = [];
  if (counters.losses) reasons.push(`💀 خسر ${counters.losses} ${counters.losses === 1 ? 'قعدة' : 'قعدات'}.`);
  if (counters.tarneeb61Breaks) reasons.push(`💥 انكسر بالـ61 ${counters.tarneeb61Breaks} مرة${counters.brokenSevens ? `، منهن ${counters.brokenSevens} بضمان 7` : ''}.`);
  if (counters.maxBrokenBid) reasons.push(`🤡 أكبر ضمان مكسور كان ${counters.maxBrokenBid}.`);
  if (counters.tarneeb41Breaks) reasons.push(`📉 انكسر بالـ41 ${counters.tarneeb41Breaks} مرة.`);
  if (counters.queenSpades) reasons.push(`👸 أكل بنت البستوني ${counters.queenSpades} مرة${counters.doubledQueens ? `، ${counters.doubledQueens} مدبلة` : ''}.`);
  if (counters.kingClubs) reasons.push(`👴 أكل ختيار الزهر ${counters.kingClubs} مرة.`);
  if (counters.hearts) reasons.push(`♥ بلع ${counters.hearts} كوباية.`);
  if (counters.worstLikhaRound !== undefined) reasons.push(`☠️ أسوأ جولة ليخة: ${counters.worstLikhaRound}.`);
  if (counters.oldMan) reasons.push(`🃏 أكل الختيار ${counters.oldMan} مرة${counters.doubledOldMan ? `، ${counters.doubledOldMan} مدبل` : ''}.`);
  if (counters.worstLash !== undefined) reasons.push(`🔥 أكبر لطشة مأكولة: ${counters.worstLash}.`);
  if (counters.trixLast) reasons.push(`🪑 حلّ أخير بالتركس ${counters.trixLast} مرة.`);
  return reasons;
}

export function calculateWeeklyPlayerStats(games: GameSession[], rounds: GameRound[], bounds: WeekBounds): WeeklyPlayerStats[] {
  const relevant = games.filter((game) => isCompletedGameInWeek(game, bounds));
  const stats = new Map<string, WeeklyPlayerStats>();
  const byGame = new Map<string, GameRound[]>(); rounds.forEach((round) => byGame.set(round.gameId, [...(byGame.get(round.gameId) ?? []), round]));
  const find = (game: GameSession, playerId: string) => {
    const player = game.players.find((entry) => entry.id === playerId); if (!player?.profileId) return undefined;
    const item = stats.get(player.profileId) ?? { profileId: player.profileId, name: player.name, completedGames: 0, donkeyScore: 0, catastrophicEvents: 0, worstEventSeverity: 0, counters: blankCounters(), reasons: [] };
    item.name = player.name; stats.set(player.profileId, item); return item;
  };
  const add = (item: WeeklyPlayerStats | undefined, points: number, catastrophic = false) => { if (!item) return; item.donkeyScore += points; item.worstEventSeverity = Math.max(item.worstEventSeverity, Math.max(0, points)); if (catastrophic) item.catastrophicEvents += 1; };

  relevant.forEach((game) => {
    game.players.forEach((player) => { const item = find(game, player.id); if (!item) return; item.completedGames += 1; if (didPlayerWin(game, player.id)) { item.counters.wins += 1; add(item, WEEKLY_DONKEY_WEIGHTS.gameWin); } else { item.counters.losses += 1; add(item, WEEKLY_DONKEY_WEIGHTS.gameLoss); } });
    const gameRounds = (byGame.get(game.id) ?? []).sort((a, b) => a.index - b.index);

    if (game.gameType === 'tarneeb-61') {
      const failures = new Map<string, number>();
      buildTarneeb61Attempts(game, gameRounds).forEach((attempt) => {
        const item = find(game, attempt.playerId); if (!item) return;
        if (attempt.succeeded) { failures.set(attempt.playerId, 0); return; }
        const run = (failures.get(attempt.playerId) ?? 0) + 1; failures.set(attempt.playerId, run);
        item.counters.tarneeb61Breaks += 1; item.counters.maxBrokenBid = Math.max(item.counters.maxBrokenBid, attempt.bid);
        if (attempt.bid === 7) { item.counters.brokenSevens += 1; add(item, WEEKLY_DONKEY_WEIGHTS.brokenSeven, true); }
        else add(item, WEEKLY_DONKEY_WEIGHTS.tarneeb61Break, attempt.bid >= 10);
        if (run === 3) add(item, WEEKLY_DONKEY_WEIGHTS.failureStreakThree, true); else if (run > 3) add(item, WEEKLY_DONKEY_WEIGHTS.failureStreakExtra);
      });
    }

    if (game.gameType === 'tarneeb-41') gameRounds.filter((round) => round.type === 'tarneeb-41').forEach((round) => (round.input as Tarneeb41RoundInput).entries.filter((entry) => !entry.success).forEach((entry) => { const item = find(game, entry.playerId); if (!item) return; item.counters.tarneeb41Breaks += 1; item.counters.maxBrokenBid = Math.max(item.counters.maxBrokenBid, entry.bid); add(item, entry.bid >= 9 ? WEEKLY_DONKEY_WEIGHTS.tarneeb41BigBreak : WEEKLY_DONKEY_WEIGHTS.tarneeb41Break, entry.bid >= 9); }));

    if (game.gameType === 'likha') gameRounds.filter((round) => round.type === 'likha').forEach((round) => {
      const input = round.input as LikhaRoundInput; const delta = calculateLikhaRound(input, game.players.map((player) => player.id), game.teams);
      input.players.forEach((capture) => { const item = find(game, capture.playerId); if (!item) return; item.counters.hearts += capture.heartsCount; add(item, Math.floor(capture.heartsCount / 4)); const score = delta[capture.playerId] ?? 0; item.counters.worstLikhaRound = Math.min(item.counters.worstLikhaRound ?? score, score); if (score <= -20) add(item, Math.min(10, Math.ceil(Math.abs(score) / 8)), score <= -30); });
      const special = input.specialCards;
      const queen = find(game, special.queenSpades.capturedBy); if (queen) { queen.counters.queenSpades += 1; if (special.queenSpades.doubled) queen.counters.doubledQueens += 1; add(queen, special.queenSpades.doubled ? WEEKLY_DONKEY_WEIGHTS.likhaQueenDoubled : WEEKLY_DONKEY_WEIGHTS.likhaQueen, special.queenSpades.doubled); }
      const king = find(game, special.kingClubs.capturedBy); if (king) { king.counters.kingClubs += 1; add(king, special.kingClubs.doubled ? WEEKLY_DONKEY_WEIGHTS.likhaKingDoubled : WEEKLY_DONKEY_WEIGHTS.likhaKing, special.kingClubs.doubled); }
      const jack = find(game, special.jackDiamonds.capturedBy); if (jack) { jack.counters.jackDiamonds += 1; add(jack, special.jackDiamonds.doubled ? WEEKLY_DONKEY_WEIGHTS.likhaJackDoubled : WEEKLY_DONKEY_WEIGHTS.likhaJack, special.jackDiamonds.doubled); }
      const ten = find(game, special.tenDiamonds.capturedBy); if (ten) { ten.counters.tenDiamonds += 1; add(ten, special.tenDiamonds.doubled ? WEEKLY_DONKEY_WEIGHTS.tenDiamondsDoubled : WEEKLY_DONKEY_WEIGHTS.tenDiamonds); }
    });

    if (game.gameType === 'cc' || game.gameType === 'trix-fast') gameRounds.forEach((round) => {
      if (round.type === 'lash' && 'kind' in round.input) {
        const input = round.input as LashRoundInput; const eater = find(game, input.oldMan.eaterPlayerId); if (eater) { eater.counters.oldMan += 1; if (input.oldMan.doubled) eater.counters.doubledOldMan += 1; add(eater, input.oldMan.doubled ? WEEKLY_DONKEY_WEIGHTS.oldManDoubled : WEEKLY_DONKEY_WEIGHTS.oldMan, input.oldMan.doubled); }
        if (input.kind === 'lash-solo' || input.kind === 'lash') Object.entries(input.scoresByPlayer).forEach(([playerId, score]) => { const item = find(game, playerId); if (!item || score > -250) return; item.counters.worstLash = Math.min(item.counters.worstLash ?? score, score); add(item, Math.min(8, Math.ceil(Math.abs(score) / 100)), score <= -350); });
      }
      if (round.type === 'trix-ranking' && 'finishingOrder' in round.input) { const playerId = round.input.finishingOrder[3]; const item = find(game, playerId); if (item) { item.counters.trixLast += 1; add(item, WEEKLY_DONKEY_WEIGHTS.trixLast); } }
    });
  });
  return [...stats.values()].map((item) => ({ ...item, donkeyScore: Math.max(0, item.donkeyScore), reasons: reasonLines(item.counters) }));
}

export function calculateWeeklyDonkeyScore(stats: WeeklyPlayerStats) { return stats.donkeyScore; }

export function selectWeeklyDonkey(players: WeeklyPlayerStats[], minimumCompletedGames = 2): WeeklyPlayerStats[] {
  const eligible = players.filter((player) => player.completedGames >= minimumCompletedGames && player.donkeyScore > 0).sort((a, b) => b.donkeyScore - a.donkeyScore || b.counters.losses - a.counters.losses || b.catastrophicEvents - a.catastrophicEvents || b.worstEventSeverity - a.worstEventSeverity || a.profileId.localeCompare(b.profileId));
  const first = eligible[0]; if (!first) return [];
  return eligible.filter((player) => player.donkeyScore === first.donkeyScore && player.counters.losses === first.counters.losses && player.catastrophicEvents === first.catastrophicEvents && player.worstEventSeverity === first.worstEventSeverity);
}

export function calculateWeeklyDonkey(games: GameSession[], rounds: GameRound[], bounds = getLocalWeekBounds()): WeeklyDonkeyResult {
  const stats = calculateWeeklyPlayerStats(games, rounds, bounds); const eligible = stats.filter((player) => player.completedGames >= 2); return { bounds, eligible, winners: selectWeeklyDonkey(stats) };
}
