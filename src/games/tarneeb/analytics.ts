import type { GameRound, GameSession, GameTeam, TarneebRoundInput } from '../../types';
import { calculateTarneeb61Round, calculateTarneebRound } from './scoring';

export type Tarneeb61Attempt = {
  roundId: string;
  roundIndex: number;
  playerId: string;
  teamId: string;
  bid: number;
  actualTricks: number;
  succeeded: boolean;
  occurredAt: string;
};

export type TarneebPlayerSessionStats = {
  playerId: string;
  playerName: string;
  teamId?: string;
  totalContracts: number;
  successfulContracts: number;
  failedContracts: number;
  successRate?: number;
  kaboots: number;
  brokenSevens: number;
  highestSuccessfulBid?: number;
  averageBid?: number;
  averageSuccessfulBid?: number;
  successfulSurplus: number;
  failedShortfall: number;
  longestSuccessStreak: number;
  longestFailureStreak: number;
  currentSuccessStreak: number;
  currentFailureStreak: number;
};

export type TarneebAward = {
  id: string;
  category: 'glory' | 'roast';
  title: string;
  emoji: string;
  playerIds?: string[];
  teamId?: string;
  reason: string;
  priority: number;
};

export type TarneebHistoricMoment = {
  id: string;
  type: 'kaboot' | 'second-kaboot' | 'broken-seven' | 'double-broken-seven' | 'success-streak' | 'failure-streak' | 'perfect-session' | 'failed-session' | 'comeback' | 'record';
  category: 'glory' | 'roast';
  gameId: string;
  roundId?: string;
  roundIndex?: number;
  playerId?: string;
  teamId?: string;
  value?: number;
  occurredAt: string;
  text: string;
};

export type TarneebScorePoint = { round: number; scores: Record<string, number> };
export type TarneebRecord = { id: 'session-kaboots' | 'success-streak' | 'comeback'; title: string; value: number; holderIds?: string[]; teamId?: string };

export type TarneebSessionSummary = {
  gameId: string;
  game: GameSession;
  teams: GameTeam[];
  attempts: Tarneeb61Attempt[];
  playerStats: TarneebPlayerSessionStats[];
  awards: TarneebAward[];
  moments: TarneebHistoricMoment[];
  featuredMoment?: TarneebHistoricMoment;
  featuredRoast?: TarneebHistoricMoment;
  scoreTimeline: TarneebScorePoint[];
  winnerTeamIds: string[];
  comeback?: { teamId: string; deficit: number };
  story: string;
  verdict: string;
  roundCount: number;
};

export type TarneebHeadToHead = {
  playerIds: [string, string];
  games: number;
  wins: Record<string, number>;
  losses: Record<string, number>;
  contracts: Record<string, number>;
  successRates: Record<string, number | undefined>;
  kaboots: Record<string, number>;
  brokenSevens: Record<string, number>;
  currentLeaderId?: string;
  currentWinStreak: number;
  recentGameIds: string[];
};

export type TarneebPartnership = {
  playerIds: [string, string];
  games: number;
  wins: number;
  losses: number;
  winRate?: number;
  kaboots: number;
  recentGameIds: string[];
};

const isTarneeb61 = (game: GameSession) => game.gameType === 'tarneeb-61' && Boolean(game.teams?.length === 2);
const playerTeam = (game: GameSession, playerId: string) => game.teams?.find((team) => team.playerIds.includes(playerId));

function calculateAttempt(game: GameSession, round: GameRound): Tarneeb61Attempt | undefined {
  if (!isTarneeb61(game) || round.type !== 'tarneeb' || !game.teams) return undefined;
  const input = round.input as TarneebRoundInput;
  const bidderTeam = game.teams.find((team) => team.id === input.bidderTeamId);
  if (!bidderTeam || !bidderTeam.playerIds.includes(input.bidderId)) return undefined;
  const actualTricks = input.bidderTeamId === game.teams[0].id ? input.teamOneTricks : 13 - input.teamOneTricks;
  const result = game.rulesSnapshot.kind === 'tarneeb-61-v2'
    ? calculateTarneeb61Round(input, [game.teams[0].id, game.teams[1].id], game.rulesSnapshot.rules)
    : game.rulesSnapshot.kind === 'tarneeb'
      ? calculateTarneebRound(input, [game.teams[0].id, game.teams[1].id], game.rulesSnapshot.rules)
      : undefined;
  if (!result) return undefined;
  return { roundId: round.id, roundIndex: round.index, playerId: input.bidderId, teamId: input.bidderTeamId, bid: input.bid, actualTricks, succeeded: result.contractSucceeded, occurredAt: round.createdAt };
}

export function buildTarneeb61Attempts(game: GameSession, rounds: GameRound[]) {
  const seen = new Set<string>();
  return rounds
    .filter((round) => round.gameId === game.id && !seen.has(round.id) && seen.add(round.id))
    .sort((a, b) => a.index - b.index)
    .map((round) => calculateAttempt(game, round))
    .filter((attempt): attempt is Tarneeb61Attempt => Boolean(attempt));
}

function streaks(attempts: Tarneeb61Attempt[]) {
  let success = 0; let failure = 0; let longestSuccess = 0; let longestFailure = 0;
  attempts.forEach((attempt) => {
    if (attempt.succeeded) { success += 1; failure = 0; longestSuccess = Math.max(longestSuccess, success); }
    else { failure += 1; success = 0; longestFailure = Math.max(longestFailure, failure); }
  });
  return { longestSuccess, longestFailure, currentSuccess: success, currentFailure: failure };
}

export function calculateTarneeb61PlayerStats(game: GameSession, attempts: Tarneeb61Attempt[]) {
  return game.players.map<TarneebPlayerSessionStats>((player) => {
    const own = attempts.filter((attempt) => attempt.playerId === player.id);
    const successful = own.filter((attempt) => attempt.succeeded);
    const failed = own.filter((attempt) => !attempt.succeeded);
    const run = streaks(own);
    return {
      playerId: player.id, playerName: player.name, teamId: playerTeam(game, player.id)?.id,
      totalContracts: own.length, successfulContracts: successful.length, failedContracts: failed.length,
      successRate: own.length ? successful.length / own.length * 100 : undefined,
      kaboots: successful.filter((attempt) => attempt.actualTricks === 13).length,
      brokenSevens: failed.filter((attempt) => attempt.bid === 7).length,
      highestSuccessfulBid: successful.length ? Math.max(...successful.map((attempt) => attempt.bid)) : undefined,
      averageBid: own.length ? own.reduce((sum, attempt) => sum + attempt.bid, 0) / own.length : undefined,
      averageSuccessfulBid: successful.length ? successful.reduce((sum, attempt) => sum + attempt.bid, 0) / successful.length : undefined,
      successfulSurplus: successful.reduce((sum, attempt) => sum + Math.max(0, attempt.actualTricks - attempt.bid), 0),
      failedShortfall: failed.reduce((sum, attempt) => sum + Math.max(0, attempt.bid - attempt.actualTricks), 0),
      longestSuccessStreak: run.longestSuccess, longestFailureStreak: run.longestFailure,
      currentSuccessStreak: run.currentSuccess, currentFailureStreak: run.currentFailure
    };
  });
}

function leaders(stats: TarneebPlayerSessionStats[], value: (stat: TarneebPlayerSessionStats) => number, eligible: (stat: TarneebPlayerSessionStats) => boolean = () => true) {
  const candidates = stats.filter(eligible);
  if (!candidates.length) return [];
  const best = Math.max(...candidates.map(value));
  return candidates.filter((stat) => value(stat) === best);
}

function award(id: string, category: TarneebAward['category'], title: string, emoji: string, winners: TarneebPlayerSessionStats[], reason: string, priority: number): TarneebAward {
  return { id, category, title, emoji, playerIds: winners.map((winner) => winner.playerId), reason, priority };
}

function compareKing(a: TarneebPlayerSessionStats, b: TarneebPlayerSessionStats) {
  return b.successfulContracts - a.successfulContracts || b.kaboots - a.kaboots || b.longestSuccessStreak - a.longestSuccessStreak || a.failedContracts - b.failedContracts;
}

export function calculateTarneeb61Comeback(game: GameSession, rounds: GameRound[]) {
  if (!game.teams || game.winnerIds?.length !== 1) return undefined;
  const winnerId = game.winnerIds[0]; const opponent = game.teams.find((team) => team.id !== winnerId);
  if (!opponent) return undefined;
  const deficit = rounds.filter((round) => round.gameId === game.id).reduce((largest, round) => Math.max(largest, (round.scoreAfter[opponent.id] ?? 0) - (round.scoreAfter[winnerId] ?? 0)), 0);
  return deficit > 0 ? { teamId: winnerId, deficit } : undefined;
}

export function calculateTarneeb61Awards(game: GameSession, stats: TarneebPlayerSessionStats[], comeback?: { teamId: string; deficit: number }) {
  const awards: TarneebAward[] = [];
  const winnerPlayers = stats.filter((stat) => game.winnerIds?.some((teamId) => playerTeam(game, stat.playerId)?.id === teamId));
  if (winnerPlayers.length) {
    const ranked = [...winnerPlayers].sort(compareKing); const best = ranked[0];
    const kings = ranked.filter((candidate) => compareKing(candidate, best) === 0);
    awards.push(award('session-king', 'glory', 'ملك القعدة', '👑', kings, `${best.successfulContracts} ضمانات ناجحة`, 100));
  }
  const successLeaders = leaders(stats, (stat) => stat.successfulContracts, (stat) => stat.successfulContracts > 0);
  if (successLeaders.length) awards.push(award('contract-sultan', 'glory', 'سلطان الضمان', '🎯', successLeaders, `${successLeaders[0].successfulContracts} ضمانات ناجحة`, 90));
  const rateLeaders = leaders(stats, (stat) => stat.successRate ?? -1, (stat) => stat.totalContracts >= 3);
  if (rateLeaders.length) awards.push(award('contract-sniper', 'glory', 'قنّاص الضمان', '🧿', rateLeaders, `${Math.round(rateLeaders[0].successRate ?? 0)}% نجاح`, 80));
  const kabootLeaders = leaders(stats, (stat) => stat.kaboots, (stat) => stat.kaboots > 0);
  if (kabootLeaders.length) awards.push(award('kaboot-owner', 'glory', 'صاحب الكبوت', '✌️🖤', kabootLeaders, `13 ×${kabootLeaders[0].kaboots}`, 88));
  const streakLeaders = leaders(stats, (stat) => stat.longestSuccessStreak, (stat) => stat.longestSuccessStreak >= 3);
  if (streakLeaders.length) awards.push(award('sixty-one-beast', 'glory', 'وحش الـ61', '🐺', streakLeaders, `${streakLeaders[0].longestSuccessStreak} نجاحات متتالية`, 76));
  const highBid = leaders(stats, (stat) => stat.highestSuccessfulBid ?? 0, (stat) => Boolean(stat.highestSuccessfulBid));
  if (highBid.length) awards.push(award('cold-blooded', 'glory', 'بارد الأعصاب', '🧊', highBid, `نجح بضمان ${highBid[0].highestSuccessfulBid}`, 68));
  const heavyHand = leaders(stats, (stat) => stat.averageSuccessfulBid ?? 0, (stat) => stat.successfulContracts >= 3);
  if (heavyHand.length) awards.push(award('heavy-hand', 'glory', 'اليد الثقيلة', '🃏', heavyHand, `متوسط الضمان الناجح ${(heavyHand[0].averageSuccessfulBid ?? 0).toFixed(1)}`, 60));
  stats.filter((stat) => stat.successfulContracts >= 5 && (stat.successRate ?? 0) >= 75).forEach((stat) => awards.push(award(`table-executioner-${stat.playerId}`, 'glory', 'جلاد الطاولة', '🐾', [stat], `${stat.successfulContracts} نجاحات بنسبة ${Math.round(stat.successRate ?? 0)}%`, 72)));
  if (comeback) awards.push({ id: 'comeback', category: 'glory', title: 'قلب الطاولة', emoji: '🔥', teamId: comeback.teamId, reason: `رجعوا من -${comeback.deficit} وفازوا بالقعدة`, priority: 95 });

  const failureLeaders = leaders(stats, (stat) => stat.failedContracts, (stat) => stat.failedContracts >= 2);
  if (failureLeaders.length) awards.push(award('partner-danger', 'roast', 'خطر عالشريك', '☠️', failureLeaders, `${failureLeaders[0].failedContracts} انكسارات`, 90));
  const brokenSeven = leaders(stats, (stat) => stat.brokenSevens, (stat) => stat.brokenSevens >= 2);
  if (brokenSeven.length) awards.push(award('seven-nightmare', 'roast', 'كابوس الـ7', '🤡', brokenSeven, `${brokenSeven[0].brokenSevens} انكسارات بضمان 7`, 94));
  const lowRate = stats.filter((stat) => stat.totalContracts >= 3).sort((a, b) => (a.successRate ?? 0) - (b.successRate ?? 0));
  if (lowRate.length) awards.push(award('keep-away', 'roast', 'ممنوع يقرب عالضمان', '🚫', lowRate.filter((stat) => stat.successRate === lowRate[0].successRate), `${Math.round(lowRate[0].successRate ?? 0)}% نجاح`, 70));
  const failureStreak = leaders(stats, (stat) => stat.longestFailureStreak, (stat) => stat.longestFailureStreak >= 3);
  if (failureStreak.length) awards.push(award('failure-lover', 'roast', 'حبيب الانكسار', '💔', failureStreak, `${failureStreak[0].longestFailureStreak} انكسارات متتالية`, 85));
  const shortfall = leaders(stats, (stat) => stat.failedShortfall, (stat) => stat.failedShortfall > 0);
  if (shortfall.length) awards.push(award('session-disaster', 'roast', 'نكبة القعدة', '🧨', shortfall, `ناقص ${shortfall[0].failedShortfall} لطوش بالمجموع`, 75));
  stats.filter((stat) => stat.brokenSevens >= 2).forEach((stat) => awards.push(award(`ashtray-${stat.playerId}`, 'roast', 'صحن السيجارة جاهز', '🚬', [stat], `انكسر بضمان 7 مرتين`, 88)));
  stats.filter((stat) => stat.failedContracts >= 3 && stat.failedContracts > stat.successfulContracts).forEach((stat) => awards.push(award(`partner-compensation-${stat.playerId}`, 'roast', 'شريكك بدو تعويض', '🧾', [stat], `${stat.failedContracts} انكسارات مقابل ${stat.successfulContracts} نجاح`, 65)));
  stats.filter((stat) => stat.totalContracts >= 4 && (stat.successRate ?? 0) <= 25).forEach((stat) => awards.push(award(`no-cards-${stat.playerId}`, 'roast', 'ما لازم يمسك ورق', '🪑', [stat], `${Math.round(stat.successRate ?? 0)}% نجاح من ${stat.totalContracts} ضمانات`, 82)));
  stats.filter((stat) => stat.longestFailureStreak >= 4).forEach((stat) => awards.push(award(`last-time-${stat.playerId}`, 'roast', 'أبو "آخر مرة بضمن"', '😂', [stat], `${stat.longestFailureStreak} انكسارات ورا بعض`, 92)));
  return awards.sort((a, b) => b.priority - a.priority);
}

export function findTarneeb61Moments(game: GameSession, attempts: Tarneeb61Attempt[], stats: TarneebPlayerSessionStats[], comeback?: { teamId: string; deficit: number }) {
  const moments: TarneebHistoricMoment[] = []; const kaboots = new Map<string, number>(); const broken = new Map<string, number>(); const successRun = new Map<string, number>(); const failureRun = new Map<string, number>();
  const name = (id: string) => game.players.find((player) => player.id === id)?.name ?? 'لاعب';
  attempts.forEach((attempt) => {
    successRun.set(attempt.playerId, attempt.succeeded ? (successRun.get(attempt.playerId) ?? 0) + 1 : 0);
    failureRun.set(attempt.playerId, attempt.succeeded ? 0 : (failureRun.get(attempt.playerId) ?? 0) + 1);
    if (attempt.succeeded && attempt.actualTricks === 13) {
      const count = (kaboots.get(attempt.playerId) ?? 0) + 1; kaboots.set(attempt.playerId, count);
      moments.push({ id: `${attempt.roundId}-kaboot`, type: count === 2 ? 'second-kaboot' : 'kaboot', category: 'glory', gameId: game.id, roundId: attempt.roundId, roundIndex: attempt.roundIndex, playerId: attempt.playerId, value: count, occurredAt: attempt.occurredAt, text: count === 2 ? `${name(attempt.playerId)} جاب الكبوت الثاني بنفس القعدة بالجولة ${attempt.roundIndex + 1}.` : `${name(attempt.playerId)} جاب 13 بالجولة ${attempt.roundIndex + 1}.` });
    }
    if (!attempt.succeeded && attempt.bid === 7) {
      const count = (broken.get(attempt.playerId) ?? 0) + 1; broken.set(attempt.playerId, count);
      moments.push({ id: `${attempt.roundId}-broken-seven`, type: count >= 2 ? 'double-broken-seven' : 'broken-seven', category: 'roast', gameId: game.id, roundId: attempt.roundId, roundIndex: attempt.roundIndex, playerId: attempt.playerId, value: count, occurredAt: attempt.occurredAt, text: count >= 2 ? `${name(attempt.playerId)} ضمن 7 وانكسر للمرة الثانية بنفس القعدة.` : `${name(attempt.playerId)} ضمن 7 وانكسر.` });
    }
    const successes = successRun.get(attempt.playerId) ?? 0; const failures = failureRun.get(attempt.playerId) ?? 0;
    if (successes === 3 || successes === 5) moments.push({ id: `${attempt.roundId}-success-${successes}`, type: 'success-streak', category: 'glory', gameId: game.id, roundId: attempt.roundId, roundIndex: attempt.roundIndex, playerId: attempt.playerId, value: successes, occurredAt: attempt.occurredAt, text: `${name(attempt.playerId)} نجح بـ${successes} ضمانات ورا بعض.` });
    if (failures === 3 || failures === 4) moments.push({ id: `${attempt.roundId}-failure-${failures}`, type: 'failure-streak', category: 'roast', gameId: game.id, roundId: attempt.roundId, roundIndex: attempt.roundIndex, playerId: attempt.playerId, value: failures, occurredAt: attempt.occurredAt, text: `${name(attempt.playerId)} انكسر ${failures} ضمانات ورا بعض.` });
  });
  stats.forEach((stat) => {
    if (stat.totalContracts >= 3 && stat.successRate === 100) moments.push({ id: `${game.id}-${stat.playerId}-perfect`, type: 'perfect-session', category: 'glory', gameId: game.id, playerId: stat.playerId, value: stat.totalContracts, occurredAt: game.finishedAt ?? game.updatedAt, text: `${stat.playerName} أنهى القعدة بنجاح 100% من ${stat.totalContracts} ضمانات.` });
    if (stat.totalContracts >= 3 && stat.successRate === 0) moments.push({ id: `${game.id}-${stat.playerId}-zero`, type: 'failed-session', category: 'roast', gameId: game.id, playerId: stat.playerId, value: stat.totalContracts, occurredAt: game.finishedAt ?? game.updatedAt, text: `${stat.playerName} ضمن ${stat.totalContracts} مرات وانكسر فيهن كلن.` });
  });
  if (comeback) moments.push({ id: `${game.id}-comeback`, type: 'comeback', category: 'glory', gameId: game.id, teamId: comeback.teamId, value: comeback.deficit, occurredAt: game.finishedAt ?? game.updatedAt, text: `${game.teams?.find((team) => team.id === comeback.teamId)?.name ?? 'الفريق الفائز'} رجع من فارق ${comeback.deficit} وفاز.` });
  return moments;
}

function deterministicIndex(id: string, length: number) {
  let hash = 2166136261;
  for (const char of id) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return Math.abs(hash) % length;
}

export function generateTarneeb61Story(game: GameSession, stats: TarneebPlayerSessionStats[], moments: TarneebHistoricMoment[], comeback?: { teamId: string; deficit: number }) {
  const top = [...stats].sort((a, b) => b.successfulContracts - a.successfulContracts || b.kaboots - a.kaboots)[0];
  const worst = [...stats].sort((a, b) => b.failedContracts - a.failedContracts)[0];
  const kaboots = stats.reduce((sum, stat) => sum + stat.kaboots, 0); const failures = stats.reduce((sum, stat) => sum + stat.failedContracts, 0);
  const facts: string[] = [];
  if (top?.successfulContracts) facts.push(`${top.playerName} استلم الضمان ونجح بـ${top.successfulContracts} من أصل ${top.totalContracts}.`);
  if (worst?.failedContracts >= 2) facts.push(`${worst.playerName} انكسر ${worst.failedContracts} مرات وخلّى شريكو يعيد حساباته 😂.`);
  if (kaboots) facts.push(`الكبوت حضر ${kaboots === 1 ? 'مرة' : `${kaboots} مرات`} بالقعدة.`);
  if (comeback) facts.push(`والنتيجة انقلبت بعد تأخر ${comeback.deficit} نقطة وصارت القعدة نار.`);
  if (!facts.length) facts.push('القعدة كانت هادية والضمان توزّع بدون أحداث كبيرة، بس الحساب بالآخر حكى كلمته.');
  const openings = failures >= 5 ? ['قعدة كان لازم يكون معها جهاز ضغط.', 'الأعصاب بهالقعدة اشتغلت أكتر من الورق.'] : moments.some((moment) => moment.type === 'second-kaboot') ? ['ما كان في كتير مجال للنقاش.', 'الكبوت قرر يكون ضيف القعدة الثقيل.'] : ['القعدة بلشت هادية، وبعدين الضمان بلش يحكي.', 'كل شي كان طبيعي... لحد ما بلشت الجدّية.'];
  return `${openings[deterministicIndex(game.id, openings.length)]} ${facts.join(' ')}`;
}

export function generateTarneeb61Verdict(game: GameSession, stats: TarneebPlayerSessionStats[], comeback?: { teamId: string; deficit: number }) {
  const kaboots = stats.reduce((sum, stat) => sum + stat.kaboots, 0); const failures = stats.reduce((sum, stat) => sum + stat.failedContracts, 0);
  if (kaboots >= 2) return 'الحكم النهائي: لما الكبوت يحضر مرتين، الباقي بيصير تفاصيل 👑';
  if (comeback) return 'الحكم النهائي: اللي طلع من القعدة قبل النهاية خسر أحلى قلبة 😂';
  if (failures >= 5) return 'الحكم النهائي: القعدة كانت اختبار أعصاب أكتر من إنها شدة.';
  const scores = game.teams?.map((team) => game.scores[team.id] ?? 0) ?? []; const gap = scores.length === 2 ? Math.abs(scores[0] - scores[1]) : 0;
  if (gap >= 20) return 'الحكم النهائي: دعس رسمي ومافي مجال للاعتراض 🐾';
  return 'الحكم النهائي: الورق خلص، بس الحكي عن القعدة لسا بأوله.';
}

export function buildTarneeb61SessionSummary(game: GameSession, rounds: GameRound[]): TarneebSessionSummary {
  if (!isTarneeb61(game) || !game.teams) throw new Error('ملخص القعدة متاح لطرنيب 61 فقط');
  const relevant = rounds.filter((round) => round.gameId === game.id).sort((a, b) => a.index - b.index);
  const attempts = buildTarneeb61Attempts(game, relevant); const playerStats = calculateTarneeb61PlayerStats(game, attempts);
  const comeback = calculateTarneeb61Comeback(game, relevant); const awards = calculateTarneeb61Awards(game, playerStats, comeback);
  const moments = findTarneeb61Moments(game, attempts, playerStats, comeback);
  const priority: TarneebHistoricMoment['type'][] = ['second-kaboot', 'comeback', 'kaboot', 'success-streak', 'broken-seven', 'failure-streak'];
  const priorityRank = (type: TarneebHistoricMoment['type']) => { const index = priority.indexOf(type); return index < 0 ? 99 : index; };
  const featuredMoment = [...moments].filter((moment) => moment.category === 'glory').sort((a, b) => priorityRank(a.type) - priorityRank(b.type))[0];
  const roastPriority: TarneebHistoricMoment['type'][] = ['double-broken-seven', 'failure-streak', 'failed-session', 'broken-seven'];
  const roastRank = (type: TarneebHistoricMoment['type']) => { const index = roastPriority.indexOf(type); return index < 0 ? 99 : index; };
  const featuredRoast = [...moments].filter((moment) => moment.category === 'roast').sort((a, b) => roastRank(a.type) - roastRank(b.type) || (b.value ?? 0) - (a.value ?? 0))[0];
  return {
    gameId: game.id, game, teams: game.teams, attempts, playerStats, awards, moments, featuredMoment, featuredRoast,
    scoreTimeline: [{ round: 0, scores: Object.fromEntries(game.teams.map((team) => [team.id, 0])) }, ...relevant.map((round) => ({ round: round.index + 1, scores: round.scoreAfter }))],
    winnerTeamIds: game.winnerIds ?? [], comeback,
    story: generateTarneeb61Story(game, playerStats, moments, comeback), verdict: generateTarneeb61Verdict(game, playerStats, comeback), roundCount: attempts.length
  };
}

export function tryBuildTarneeb61SessionSummary(game: GameSession, rounds: GameRound[]) {
  try { return buildTarneeb61SessionSummary(game, rounds); } catch { return undefined; }
}

export function calculateHeadToHead(games: GameSession[], rounds: GameRound[], firstId: string, secondId: string): TarneebHeadToHead {
  const relevant = games.filter((game) => game.status === 'completed' && isTarneeb61(game) && game.players.some((player) => player.id === firstId) && game.players.some((player) => player.id === secondId) && playerTeam(game, firstId)?.id !== playerTeam(game, secondId)?.id).sort((a, b) => a.finishedAt?.localeCompare(b.finishedAt ?? '') ?? 0);
  const wins = { [firstId]: 0, [secondId]: 0 }; const losses = { [firstId]: 0, [secondId]: 0 }; const contracts = { [firstId]: 0, [secondId]: 0 }; const successes = { [firstId]: 0, [secondId]: 0 }; const kaboots = { [firstId]: 0, [secondId]: 0 }; const brokenSevens = { [firstId]: 0, [secondId]: 0 };
  let currentLeaderId: string | undefined; let currentWinStreak = 0;
  relevant.forEach((game) => {
    const winnerTeam = game.winnerIds?.[0]; const firstWon = playerTeam(game, firstId)?.id === winnerTeam; const winner = firstWon ? firstId : secondId; const loser = firstWon ? secondId : firstId;
    wins[winner] += 1; losses[loser] += 1; if (currentLeaderId === winner) currentWinStreak += 1; else { currentLeaderId = winner; currentWinStreak = 1; }
    const summary = tryBuildTarneeb61SessionSummary(game, rounds.filter((round) => round.gameId === game.id));
    if (!summary) return;
    [firstId, secondId].forEach((id) => { const stat = summary.playerStats.find((item) => item.playerId === id); if (!stat) return; contracts[id] += stat.totalContracts; successes[id] += stat.successfulContracts; kaboots[id] += stat.kaboots; brokenSevens[id] += stat.brokenSevens; });
  });
  return { playerIds: [firstId, secondId], games: relevant.length, wins, losses, contracts, successRates: { [firstId]: contracts[firstId] ? successes[firstId] / contracts[firstId] * 100 : undefined, [secondId]: contracts[secondId] ? successes[secondId] / contracts[secondId] * 100 : undefined }, kaboots, brokenSevens, currentLeaderId, currentWinStreak, recentGameIds: relevant.slice(-5).reverse().map((game) => game.id) };
}

export function calculatePartnership(games: GameSession[], rounds: GameRound[], firstId: string, secondId: string): TarneebPartnership {
  const relevant = games.filter((game) => game.status === 'completed' && isTarneeb61(game) && playerTeam(game, firstId)?.id === playerTeam(game, secondId)?.id && game.players.some((player) => player.id === firstId) && game.players.some((player) => player.id === secondId));
  let wins = 0; let kaboots = 0;
  relevant.forEach((game) => { if (game.winnerIds?.includes(playerTeam(game, firstId)?.id ?? '')) wins += 1; const summary = tryBuildTarneeb61SessionSummary(game, rounds.filter((round) => round.gameId === game.id)); if (summary) kaboots += summary.playerStats.filter((stat) => stat.playerId === firstId || stat.playerId === secondId).reduce((sum, stat) => sum + stat.kaboots, 0); });
  return { playerIds: [firstId, secondId], games: relevant.length, wins, losses: relevant.length - wins, winRate: relevant.length ? wins / relevant.length * 100 : undefined, kaboots, recentGameIds: relevant.slice(-5).reverse().map((game) => game.id) };
}

export function buildAllTimePlayerStats(games: GameSession[], rounds: GameRound[]) {
  const completed = games.filter((game) => game.status === 'completed' && isTarneeb61(game)); const aggregate = new Map<string, { playerId: string; name: string; games: number; wins: number; contracts: number; successes: number; kaboots: number; brokenSevens: number; longestSuccessStreak: number }>();
  completed.forEach((game) => tryBuildTarneeb61SessionSummary(game, rounds.filter((round) => round.gameId === game.id))?.playerStats.forEach((stat) => {
    const item = aggregate.get(stat.playerId) ?? { playerId: stat.playerId, name: stat.playerName, games: 0, wins: 0, contracts: 0, successes: 0, kaboots: 0, brokenSevens: 0, longestSuccessStreak: 0 };
    item.games += 1; item.wins += game.winnerIds?.includes(stat.teamId ?? '') ? 1 : 0; item.contracts += stat.totalContracts; item.successes += stat.successfulContracts; item.kaboots += stat.kaboots; item.brokenSevens += stat.brokenSevens; item.longestSuccessStreak = Math.max(item.longestSuccessStreak, stat.longestSuccessStreak); aggregate.set(stat.playerId, item);
  }));
  return [...aggregate.values()].map((item) => ({ ...item, successRate: item.contracts ? item.successes / item.contracts * 100 : undefined })).sort((a, b) => b.wins - a.wins || b.successes - a.successes);
}

export function detectTarneeb61Records(current: TarneebSessionSummary, previous: TarneebSessionSummary[]): TarneebRecord[] {
  if (current.game.status !== 'completed') return [];
  const baseline = previous.filter((summary) => summary.gameId !== current.gameId && summary.game.status === 'completed'); const records: TarneebRecord[] = [];
  const currentKaboot = Math.max(0, ...current.playerStats.map((stat) => stat.kaboots)); const previousKaboot = Math.max(0, ...baseline.flatMap((summary) => summary.playerStats.map((stat) => stat.kaboots)));
  if (currentKaboot > 0 && currentKaboot > previousKaboot) records.push({ id: 'session-kaboots', title: 'أكثر كبوتات للاعب خلال قعدة', value: currentKaboot, holderIds: current.playerStats.filter((stat) => stat.kaboots === currentKaboot).map((stat) => stat.playerId) });
  const currentStreak = Math.max(0, ...current.playerStats.map((stat) => stat.longestSuccessStreak)); const previousStreak = Math.max(0, ...baseline.flatMap((summary) => summary.playerStats.map((stat) => stat.longestSuccessStreak)));
  if (currentStreak >= 3 && currentStreak > previousStreak) records.push({ id: 'success-streak', title: 'أطول سلسلة ضمان ناجح', value: currentStreak, holderIds: current.playerStats.filter((stat) => stat.longestSuccessStreak === currentStreak).map((stat) => stat.playerId) });
  const currentComeback = current.comeback?.deficit ?? 0; const previousComeback = Math.max(0, ...baseline.map((summary) => summary.comeback?.deficit ?? 0));
  if (currentComeback > 0 && currentComeback > previousComeback) records.push({ id: 'comeback', title: 'أكبر قلبة مسجلة', value: currentComeback, teamId: current.comeback?.teamId });
  return records;
}
