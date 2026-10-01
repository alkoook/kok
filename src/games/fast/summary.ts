import type { GameRound, GameSession, LashRoundInput, TrixRankingInput } from '../../types';
import { interpolateTemplate } from './messages';
import { partnerForPlayer, partnershipLashScores } from './scoring';
import type { SummarySegment, TitleDefinition, TitleSignal } from './summaryContent';

export type SummaryEntry = { id: string; name: string; score: number };
export type KingdomRecap = { index: number; ownerId: string; ownerName: string; lash: SummaryEntry[]; trixOrder?: SummaryEntry[]; delta: SummaryEntry[]; oldMen: Array<{ playerId: string; playerName: string; doubled: boolean }> };
export type SessionAward = { id: string; title: string; subject: string; detail: string; tone: 'star' | 'roast' };
export type AwardedTitle = { id: string; title: string; subject: string; signal: TitleSignal };
export type FunnyStatistic = { id: string; label: string; value: string; detail: string };
export type SummaryMetrics = { worstLash?: number; bestLash?: number; strongestKingdom?: number; weakestKingdom?: number; firstPlaces: number; fourthPlaces: number; oldMen: number; doubledOldMen: number; leadChanges: number; largestSwing: number; biggestComeback: number; winnerScore: number };
export type FastSessionSummary = { gameId: string; gameType: GameSession['gameType']; standings: SummaryEntry[]; winnerIds: string[]; margin: number; kingdoms: KingdomRecap[]; awards: SessionAward[]; titles: AwardedTitle[]; story: string[]; stars: string[]; roasts: string[]; funnyStatistics: FunnyStatistic[]; records: string[]; metrics: SummaryMetrics; signature: string; segmentIds: string[]; titleIds: string[]; comeback: boolean };

const hash = (value: string) => [...value].reduce((result, char) => (result * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
const sumDeltas = (rounds: GameRound[], ids: string[]) => Object.fromEntries(ids.map((id) => [id, rounds.reduce((sum, round) => sum + (round.scoreDelta[id] ?? 0), 0)]));
const maxBy = <T>(values: T[], value: (item: T) => number) => values.length ? [...values].sort((a, b) => value(b) - value(a))[0] : undefined;
const minBy = <T>(values: T[], value: (item: T) => number) => values.length ? [...values].sort((a, b) => value(a) - value(b))[0] : undefined;

export function buildFastSessionSummary(game: GameSession, rounds: GameRound[], segments: SummarySegment[], titles: TitleDefinition[], recentSignatures: string[] = [], recentTitleIds: string[] = [], recentSegmentIds: string[] = []): FastSessionSummary {
  const scoreName = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? id;
  const standings = Object.entries(game.scores).map(([id, score]) => ({ id, name: scoreName(id), score })).sort((a, b) => b.score - a.score);
  const best = standings[0]?.score ?? 0;
  const winnerIds = standings.filter((entry) => entry.score === best).map((entry) => entry.id);
  const margin = standings.length > 1 ? standings[0].score - standings[1].score : 0;
  const scoreIds = standings.map((entry) => entry.id);
  const rawLashScores = (input: LashRoundInput) => input.kind === 'lash-partnership' || input.kind === 'lash-partnership-fixed-total' ? partnershipLashScores(input, game.teams ?? []) : input.scoresByPlayer;
  const kingdomRecaps: KingdomRecap[] = Array.from({ length: 4 }, (_, index) => {
    const kingdomRounds = rounds.filter((round) => round.kingdomIndex === index && round.type !== 'manual-adjustment');
    const owner = game.players[(Math.max(0, game.players.findIndex((player) => player.id === game.firstKingdomOwnerId)) + index) % 4];
    const lashRounds = kingdomRounds.filter((round) => round.type === 'lash');
    const lash = lashRounds.flatMap((round) => Object.entries(rawLashScores(round.input as LashRoundInput)).map(([id, score]) => ({ id: `${round.id}-${id}`, name: `${scoreName(id)}${lashRounds.length > 1 ? ` · لطش ${lashRounds.indexOf(round) + 1}` : ''}`, score })));
    const trixRound = kingdomRounds.find((round) => round.type === 'trix-ranking');
    const trixOrder = trixRound ? (trixRound.input as TrixRankingInput).finishingOrder.map((id, rank) => ({ id, name: game.players.find((player) => player.id === id)?.name ?? id, score: [200, 150, 100, 50][rank] })) : undefined;
    const oldMen = lashRounds.map((round) => (round.input as LashRoundInput).oldMan).map((oldMan) => ({ playerId: oldMan.eaterPlayerId, playerName: game.players.find((player) => player.id === oldMan.eaterPlayerId)?.name ?? oldMan.eaterPlayerId, doubled: oldMan.doubled }));
    const delta = Object.entries(sumDeltas(kingdomRounds, scoreIds)).map(([id, score]) => ({ id, name: scoreName(id), score }));
    return { index, ownerId: owner.id, ownerName: owner.name, lash, trixOrder, delta, oldMen };
  });
  const rawLashEntries = rounds.filter((round) => round.type === 'lash').flatMap((round) => Object.entries(rawLashScores(round.input as LashRoundInput)).map(([id, score]) => ({ id, name: scoreName(id), score, round })));
  const worstLash = minBy(rawLashEntries, (entry) => entry.score);
  const bestLash = maxBy(rawLashEntries, (entry) => entry.score);
  const oldManCounts = new Map<string, { total: number; doubled: number }>();
  rounds.filter((round) => round.type === 'lash').forEach((round) => { const oldMan = (round.input as LashRoundInput).oldMan; const current = oldManCounts.get(oldMan.eaterPlayerId) ?? { total: 0, doubled: 0 }; current.total += 1; if (oldMan.doubled) current.doubled += 1; oldManCounts.set(oldMan.eaterPlayerId, current); });
  const oldManLeader = maxBy([...oldManCounts], (entry) => entry[1].total);
  const doubledLeader = maxBy([...oldManCounts], (entry) => entry[1].doubled);
  const ranks = new Map<string, [number, number, number, number]>();
  rounds.filter((round) => round.type === 'trix-ranking').forEach((round) => (round.input as TrixRankingInput).finishingOrder.forEach((id, rank) => { const current = ranks.get(id) ?? [0, 0, 0, 0]; current[rank] += 1; ranks.set(id, current); }));
  const firstLeader = maxBy([...ranks], (entry) => entry[1][0]);
  const fourthLeader = maxBy([...ranks], (entry) => entry[1][3]);
  const kingdomScores = kingdomRecaps.flatMap((kingdom) => kingdom.delta.map((entry) => ({ ...entry, kingdom: kingdom.index + 1, ownerId: kingdom.ownerId, ownerName: kingdom.ownerName })));
  const strongestKingdom = maxBy(kingdomScores, (entry) => entry.score);
  const weakestKingdom = minBy(kingdomScores, (entry) => entry.score);
  const played = rounds.filter((round) => round.type !== 'manual-adjustment');
  const leadersByRound = played.map((round) => { const entries = Object.entries(round.scoreAfter); const high = Math.max(...entries.map(([, score]) => score)); return entries.filter(([, score]) => score === high).map(([id]) => id).sort().join('|'); });
  const leadChanges = leadersByRound.slice(1).filter((leader, index) => leader !== leadersByRound[index]).length;
  const biggestComeback = winnerIds.reduce((largest, winnerId) => Math.max(largest, ...played.slice(0, -1).map((round) => Math.max(...scoreIds.map((id) => round.scoreAfter[id] ?? 0)) - (round.scoreAfter[winnerId] ?? 0))), 0);
  const comeback = biggestComeback > 0;
  const largestSwing = played.reduce((largest, round) => { const values = Object.values(round.scoreDelta); return Math.max(largest, values.length ? Math.max(...values) - Math.min(...values) : 0); }, 0);
  const kingdomWins = kingdomRecaps.filter((kingdom) => kingdom.delta.some((entry) => winnerIds.includes(entry.id) && entry.score === Math.max(...kingdom.delta.map((item) => item.score)))).length;
  const ownerBehindPartner = rounds.filter((round) => round.type === 'trix-ranking').filter((round) => { const order = (round.input as TrixRankingInput).finishingOrder; const ownerId = round.kingdomOwnerId ?? ''; const partnerId = partnerForPlayer(ownerId, game.teams); return Boolean(partnerId && order.indexOf(ownerId) > order.indexOf(partnerId)); }).length;
  const placementRows = [...ranks].map(([id, counts]) => ({ id, average: counts.reduce((sum, count, rank) => sum + count * (rank + 1), 0) / Math.max(1, counts.reduce((sum, count) => sum + count, 0)) }));
  const worstAverage = maxBy(placementRows, (entry) => entry.average);
  const trixPoints = new Map([...ranks].map(([id, counts]) => [id, counts.reduce((sum, count, rank) => sum + count * [200, 150, 100, 50][rank], 0)]));
  const partnershipGap = maxBy((game.teams ?? []).map((team) => {
    const members = team.playerIds.map((id) => ({ id, score: trixPoints.get(id) ?? 0 })).sort((a, b) => b.score - a.score);
    return { team, leader: members[0], partner: members[1], gap: members[0].score - members[1].score };
  }).filter((entry) => ranks.has(entry.leader.id) && ranks.has(entry.partner.id)), (entry) => entry.gap);
  const oldManTotal = [...oldManCounts.values()].reduce((sum, value) => sum + value.total, 0);
  const doubledTotal = [...oldManCounts.values()].reduce((sum, value) => sum + value.doubled, 0);
  const winnerName = standings.filter((entry) => winnerIds.includes(entry.id)).map((entry) => entry.name).join(' و ');
  const loser = standings.at(-1);
  const funnyStatistics: FunnyStatistic[] = [
    { id: 'fourth', label: 'اشتراك المركز الرابع', value: String(fourthLeader?.[1][3] ?? 0), detail: fourthLeader ? game.players.find((player) => player.id === fourthLeader[0])?.name ?? '' : 'لا يوجد تركس' },
    { id: 'old-men', label: 'بوفيه الختيار', value: String(oldManTotal), detail: `${doubledTotal} منهم مدبل` },
    { id: 'worst-lash', label: 'مطالبة التأمين', value: String(worstLash?.score ?? '—'), detail: worstLash?.name ?? 'لا توجد لطشة' },
    { id: 'best-lash', label: 'أخف الأضرار', value: String(bestLash?.score ?? '—'), detail: bestLash?.name ?? 'لا توجد لطشة' },
    { id: 'lead-changes', label: 'دوخة الصدارة', value: String(leadChanges), detail: 'تبدلات القائد أثناء المباراة' },
    { id: 'kingdom-wins', label: 'ممالك تحت السيطرة', value: `${kingdomWins}/4`, detail: winnerName },
    { id: 'owner-behind', label: 'الملك خلف شريكه', value: String(ownerBehindPartner), detail: 'مرات أنهى المالك بعد شريكه بالتركس' },
    { id: 'largest-swing', label: 'أكبر رجّة بالنقاط', value: String(largestSwing), detail: 'أكبر فارق دلتا في جولة واحدة' }
  ];
  if (worstAverage) funnyStatistics.push({ id: 'average-placement', label: 'متوسط الوصول المتأخر', value: worstAverage.average.toFixed(2), detail: game.players.find((player) => player.id === worstAverage.id)?.name ?? worstAverage.id });
  if (partnershipGap) funnyStatistics.push({ id: 'partnership-gap', label: 'فرق حمل الشراكة بالتركس', value: String(partnershipGap.gap), detail: `${game.players.find((player) => player.id === partnershipGap.leader.id)?.name} فوق ${game.players.find((player) => player.id === partnershipGap.partner.id)?.name}` });
  if (game.gameType === 'cc') funnyStatistics.push({ id: 'cc-damage', label: 'فاتورة أضرار CC', value: String(Math.abs(Object.values(game.scores).reduce((sum, score) => sum + score, 0))), detail: 'مجموع السالب المسجل' });

  const values = { winner: winnerName, loser: loser?.name, margin, score: worstLash?.score, kingdom: strongestKingdom?.kingdom, player: oldManLeader ? game.players.find((player) => player.id === oldManLeader[0])?.name : undefined, fourthCount: fourthLeader?.[1][3] ?? 0, oldManCount: oldManTotal, doubledCount: doubledTotal, leadChanges, kingdomWins, ownerBehindPartner, largestSwing, averagePlacement: worstAverage?.average.toFixed(2) ?? 0, bestLash: bestLash?.score ?? 0 };
  const enabled = segments.filter((segment) => segment.enabled);
  const group = (...categories: SummarySegment['category'][]) => enabled.filter((segment) => categories.includes(segment.category));
  const storyPools: SummarySegment[][] = [
    group('opening', 'dramatic-opening'),
    group(game.gameType === 'cc' ? 'cc' : 'fast-trix'),
    group(margin >= 300 ? 'blowout' : margin <= 100 ? 'close-match' : 'winner'),
    ...(game.trixMode === 'partnership' ? [group('partnership-praise', 'partnership-disaster')] : []),
    ...(ranks.size ? [group('trix-genius', 'trix-disaster')] : []),
    ...(strongestKingdom ? [group('kingdom-praise', 'kingdom-disaster')] : []),
    ...(oldManCounts.size ? [group(doubledTotal ? 'doubled-old-man' : oldManLeader && oldManLeader[1].total > 1 ? 'repeated-old-man' : 'old-man')] : []),
    ...(worstLash && worstLash.score <= -250 ? [group('disaster', 'loser')] : []),
    ...(comeback ? [group('comeback', 'collapse')] : []),
    [group('closing', 'victory-closing', 'disaster-closing')].flat()
  ];
  const cappedPools = storyPools.length > 8 ? [...storyPools.slice(0, 7), storyPools.at(-1)!] : storyPools;
  let chosen: SummarySegment[] = []; let signature = '';
  for (let attempt = 0; attempt < 120; attempt += 1) {
    chosen = cappedPools.flatMap((pool, index) => {
      if (!pool.length) return [];
      const fresh = pool.filter((segment) => !recentSegmentIds.includes(segment.id));
      const candidates = fresh.length ? fresh : pool;
      return [candidates[hash(`${game.id}-${attempt}-${index}`) % candidates.length]];
    });
    signature = chosen.map((segment) => segment.id).join('|');
    if (!recentSignatures.includes(signature)) break;
  }
  const story = chosen.map((segment) => interpolateTemplate(segment.template, values));
  const awards: SessionAward[] = [];
  if (winnerName) awards.push({ id: 'winner', title: 'ملك القعدة', subject: winnerName, detail: `فاز بفارق ${margin}`, tone: 'star' });
  if (bestLash) awards.push({ id: 'best-lash', title: 'أنظف لطشة', subject: bestLash.name, detail: String(bestLash.score), tone: 'star' });
  if (worstLash) awards.push({ id: 'worst-lash', title: game.trixMode === 'partnership' ? 'الفريق صاحب أوسخ لطشة' : 'صاحب أوسخ لطشة', subject: worstLash.name, detail: String(worstLash.score), tone: 'roast' });
  if (firstLeader?.[1][0]) awards.push({ id: 'trix-first', title: 'ملك المركز الأول', subject: game.players.find((player) => player.id === firstLeader[0])?.name ?? firstLeader[0], detail: `${firstLeader[1][0]} مرة`, tone: 'star' });
  if (fourthLeader?.[1][3]) awards.push({ id: 'trix-fourth', title: 'حبيب المركز الرابع', subject: game.players.find((player) => player.id === fourthLeader[0])?.name ?? fourthLeader[0], detail: `${fourthLeader[1][3]} مرة`, tone: 'roast' });
  if (oldManLeader?.[1].total) awards.push({ id: 'old-man', title: 'ملك الختيار', subject: game.players.find((player) => player.id === oldManLeader[0])?.name ?? oldManLeader[0], detail: `${oldManLeader[1].total} مرة`, tone: 'roast' });
  if (strongestKingdom) awards.push({ id: 'best-kingdom', title: 'أقوى مملكة', subject: strongestKingdom.name, detail: `المملكة ${strongestKingdom.kingdom} · ${strongestKingdom.score}`, tone: 'star' });
  if (weakestKingdom) awards.push({ id: 'worst-kingdom', title: 'أسوأ مملكة', subject: weakestKingdom.name, detail: `المملكة ${weakestKingdom.kingdom} · ${weakestKingdom.score}`, tone: 'roast' });

  const titleSignals: Array<{ signal: TitleSignal; subject?: string; relevant: boolean }> = [
    { signal: 'champion', subject: winnerName, relevant: Boolean(winnerName) },
    { signal: 'blowout-winner', subject: winnerName, relevant: margin >= 300 }, { signal: 'catastrophic-loser', subject: worstLash?.name, relevant: Boolean(worstLash && worstLash.score <= -350) },
    { signal: 'comeback', subject: winnerName, relevant: comeback }, { signal: 'collapse', subject: loser?.name, relevant: comeback },
    { signal: 'trix-master', subject: firstLeader ? game.players.find((player) => player.id === firstLeader[0])?.name : undefined, relevant: Boolean(firstLeader?.[1][0]) },
    { signal: 'trix-last', subject: fourthLeader ? game.players.find((player) => player.id === fourthLeader[0])?.name : undefined, relevant: Boolean(fourthLeader?.[1][3]) },
    { signal: 'old-man', subject: oldManLeader ? game.players.find((player) => player.id === oldManLeader[0])?.name : undefined, relevant: Boolean(oldManLeader?.[1].total) },
    { signal: 'doubled-old-man', subject: doubledLeader ? game.players.find((player) => player.id === doubledLeader[0])?.name : undefined, relevant: Boolean(doubledLeader?.[1].doubled) },
    { signal: 'carried-partner', subject: partnershipGap ? game.players.find((player) => player.id === partnershipGap.leader.id)?.name : undefined, relevant: Boolean(partnershipGap && partnershipGap.gap >= 100) },
    { signal: 'carried-by-partner', subject: partnershipGap ? game.players.find((player) => player.id === partnershipGap.partner.id)?.name : undefined, relevant: Boolean(partnershipGap && partnershipGap.gap >= 100) },
    { signal: 'trix-partner-mismatch', subject: partnershipGap?.team.name, relevant: Boolean(partnershipGap && partnershipGap.gap >= 100) },
    { signal: 'great-kingdom', subject: strongestKingdom?.name, relevant: Boolean(strongestKingdom) }, { signal: 'terrible-kingdom', subject: weakestKingdom?.name, relevant: Boolean(weakestKingdom) },
    { signal: 'partnership-best', subject: standings[0]?.name, relevant: game.trixMode === 'partnership' }, { signal: 'partnership-disaster', subject: standings.at(-1)?.name, relevant: game.trixMode === 'partnership' },
    { signal: game.gameType === 'cc' ? 'cc-master' : 'consistent', subject: winnerName, relevant: true }, { signal: game.gameType === 'cc' ? 'cc-disaster' : 'chaotic', subject: loser?.name, relevant: Boolean(loser) },
    { signal: 'owner-disaster', subject: weakestKingdom?.ownerName, relevant: Boolean(weakestKingdom && weakestKingdom.score < 0) }, { signal: 'close-finish', subject: winnerName, relevant: margin <= 100 },
    { signal: 'runner-up', subject: standings[1]?.name, relevant: standings.length > 1 }, { signal: 'loser', subject: loser?.name, relevant: standings.length > 1 }
  ];
  const awardedTitles = titleSignals.filter((item) => item.relevant && item.subject).map((item, index) => {
    const pool = titles.filter((title) => title.enabled && title.signal === item.signal);
    const fresh = pool.filter((title) => !recentTitleIds.includes(title.id)); const candidates = fresh.length ? fresh : pool;
    const title = candidates[hash(`${game.id}-${item.signal}-${index}`) % Math.max(1, candidates.length)];
    return title ? { id: title.id, title: title.template, subject: item.subject!, signal: item.signal } : undefined;
  }).filter((item): item is AwardedTitle => Boolean(item)).slice(0, 10);
  const metrics: SummaryMetrics = { worstLash: worstLash?.score, bestLash: bestLash?.score, strongestKingdom: strongestKingdom?.score, weakestKingdom: weakestKingdom?.score, firstPlaces: firstLeader?.[1][0] ?? 0, fourthPlaces: fourthLeader?.[1][3] ?? 0, oldMen: oldManTotal, doubledOldMen: doubledTotal, leadChanges, largestSwing, biggestComeback, winnerScore: best };
  return { gameId: game.id, gameType: game.gameType, standings, winnerIds, margin, kingdoms: kingdomRecaps, awards, titles: awardedTitles, story, funnyStatistics, records: [], metrics, stars: awards.filter((award) => award.tone === 'star').map((award) => `${award.title}: ${award.subject} — ${award.detail}`), roasts: awards.filter((award) => award.tone === 'roast').map((award) => `${award.title}: ${award.subject} — ${award.detail}`), signature, segmentIds: chosen.map((segment) => segment.id), titleIds: awardedTitles.map((title) => title.id), comeback };
}

export function detectFastRecords(current: FastSessionSummary, previous: FastSessionSummary[]): string[] {
  if (!previous.length) return [];
  const records: string[] = [];
  const addMaximum = (label: string, value: number | undefined, select: (summary: FastSessionSummary) => number | undefined, pool = previous) => { const values = pool.map(select).filter((candidate): candidate is number => candidate !== undefined); if (value !== undefined && values.length && value >= Math.max(...values)) records.push(`${label}: ${value}`); };
  const addMinimum = (label: string, value: number | undefined, select: (summary: FastSessionSummary) => number | undefined, pool = previous) => { const values = pool.map(select).filter((candidate): candidate is number => candidate !== undefined); if (value !== undefined && values.length && value <= Math.min(...values)) records.push(`${label}: ${value}`); };
  addMaximum('أكبر فارق نهائي مسجل', current.margin, (summary) => summary.margin);
  addMinimum('أسوأ لطشة فريق بالتاريخ', current.metrics.worstLash, (summary) => summary.metrics.worstLash);
  addMaximum('أقوى مملكة مسجلة', current.metrics.strongestKingdom, (summary) => summary.metrics.strongestKingdom);
  addMinimum('أسوأ مملكة مسجلة', current.metrics.weakestKingdom, (summary) => summary.metrics.weakestKingdom);
  addMaximum('رقم قياسي لمراكز التركس الأولى', current.metrics.firstPlaces, (summary) => summary.metrics.firstPlaces);
  addMaximum('رقم قياسي لمراكز التركس الرابعة', current.metrics.fourthPlaces, (summary) => summary.metrics.fourthPlaces);
  addMaximum('أكثر ختايرة في قعدة واحدة', current.metrics.oldMen, (summary) => summary.metrics.oldMen);
  addMaximum('أكثر ختايرة مدبلة في قعدة', current.metrics.doubledOldMen, (summary) => summary.metrics.doubledOldMen);
  if (current.metrics.biggestComeback > 0) addMaximum('أكبر قلبة من تأخر', current.metrics.biggestComeback, (summary) => summary.metrics.biggestComeback);
  const sameGame = previous.filter((summary) => summary.gameType === current.gameType);
  if (current.gameType === 'trix-fast') addMaximum('أفضل مملكة Fast Trix', current.metrics.strongestKingdom, (summary) => summary.metrics.strongestKingdom, sameGame);
  if (current.gameType === 'cc') {
    addMinimum('أسوأ مملكة CC', current.metrics.weakestKingdom, (summary) => summary.metrics.weakestKingdom, sameGame);
    addMaximum('أفضل نهاية CC', current.metrics.winnerScore, (summary) => summary.metrics.winnerScore, sameGame);
  }
  return records;
}

const SUMMARY_HISTORY_KEY = 'kok-fast-summary-history';
export type SummaryHistoryEntry = { gameId: string; signature: string; segmentIds: string[]; titleIds: string[] };
export function readSummaryHistory(): SummaryHistoryEntry[] {
  try { const parsed = JSON.parse(localStorage.getItem(SUMMARY_HISTORY_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.slice(-50).map((entry) => ({ ...entry, segmentIds: Array.isArray(entry.segmentIds) ? entry.segmentIds : [] })) : []; } catch { return []; }
}
export function rememberSummary(summary: FastSessionSummary): void {
  const history = readSummaryHistory().filter((entry) => entry.gameId !== summary.gameId);
  history.push({ gameId: summary.gameId, signature: summary.signature, segmentIds: summary.segmentIds, titleIds: summary.titleIds });
  localStorage.setItem(SUMMARY_HISTORY_KEY, JSON.stringify(history.slice(-50)));
}
