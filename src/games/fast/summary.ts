import type { GameRound, GameSession, LashRoundInput, TrixRankingInput } from '../../types';
import { interpolateTemplate } from './messages';
import type { SummarySegment, TitleDefinition, TitleSignal } from './summaryContent';

export type SummaryEntry = { id: string; name: string; score: number };
export type KingdomRecap = { index: number; ownerId: string; ownerName: string; lash: SummaryEntry[]; trixOrder?: SummaryEntry[]; delta: SummaryEntry[]; oldMen: Array<{ playerId: string; playerName: string; doubled: boolean }> };
export type SessionAward = { id: string; title: string; subject: string; detail: string; tone: 'star' | 'roast' };
export type AwardedTitle = { id: string; title: string; subject: string; signal: TitleSignal };
export type FastSessionSummary = { gameId: string; standings: SummaryEntry[]; winnerIds: string[]; margin: number; kingdoms: KingdomRecap[]; awards: SessionAward[]; titles: AwardedTitle[]; story: string[]; stars: string[]; roasts: string[]; signature: string; titleIds: string[]; comeback: boolean };

const hash = (value: string) => [...value].reduce((result, char) => (result * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
const sumDeltas = (rounds: GameRound[], ids: string[]) => Object.fromEntries(ids.map((id) => [id, rounds.reduce((sum, round) => sum + (round.scoreDelta[id] ?? 0), 0)]));

export function buildFastSessionSummary(game: GameSession, rounds: GameRound[], segments: SummarySegment[], titles: TitleDefinition[], recentSignatures: string[] = [], recentTitleIds: string[] = []): FastSessionSummary {
  const scoreName = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? id;
  const standings = Object.entries(game.scores).map(([id, score]) => ({ id, name: scoreName(id), score })).sort((a, b) => b.score - a.score);
  const best = standings[0]?.score ?? 0;
  const winnerIds = standings.filter((entry) => entry.score === best).map((entry) => entry.id);
  const margin = standings.length > 1 ? standings[0].score - standings[1].score : 0;
  const scoreIds = standings.map((entry) => entry.id);
  const kingdomRecaps: KingdomRecap[] = Array.from({ length: 4 }, (_, index) => {
    const kingdomRounds = rounds.filter((round) => round.kingdomIndex === index && round.type !== 'manual-adjustment');
    const owner = game.players[(Math.max(0, game.players.findIndex((player) => player.id === game.firstKingdomOwnerId)) + index) % 4];
    const lashRounds = kingdomRounds.filter((round) => round.type === 'lash');
    const lash = lashRounds.flatMap((round) => {
      const input = round.input as LashRoundInput;
      const raw = input.kind === 'lash-partnership' ? input.scoresByTeam : input.scoresByPlayer;
      return Object.entries(raw).map(([id, score], roundIndex) => ({ id: `${round.id}-${id}`, name: `${scoreName(id)}${lashRounds.length > 1 ? ` · لطش ${lashRounds.indexOf(round) + 1}` : ''}`, score, sort: roundIndex }));
    }).map(({ id, name, score }) => ({ id, name, score }));
    const trixRound = kingdomRounds.find((round) => round.type === 'trix-ranking');
    const trixOrder = trixRound ? (trixRound.input as TrixRankingInput).finishingOrder.map((id, rank) => ({ id, name: game.players.find((player) => player.id === id)?.name ?? id, score: [200, 150, 100, 50][rank] })) : undefined;
    const oldMen = lashRounds.map((round) => (round.input as LashRoundInput).oldMan).map((oldMan) => ({ playerId: oldMan.eaterPlayerId, playerName: game.players.find((player) => player.id === oldMan.eaterPlayerId)?.name ?? oldMan.eaterPlayerId, doubled: oldMan.doubled }));
    const delta = Object.entries(sumDeltas(kingdomRounds, scoreIds)).map(([id, score]) => ({ id, name: scoreName(id), score }));
    return { index, ownerId: owner.id, ownerName: owner.name, lash, trixOrder, delta, oldMen };
  });
  const rawLashEntries = rounds.filter((round) => round.type === 'lash').flatMap((round) => {
    const input = round.input as LashRoundInput;
    const raw = input.kind === 'lash-partnership' ? input.scoresByTeam : input.scoresByPlayer;
    return Object.entries(raw).map(([id, score]) => ({ id, name: scoreName(id), score, round }));
  });
  const worstLash = [...rawLashEntries].sort((a, b) => a.score - b.score)[0];
  const bestLash = [...rawLashEntries].sort((a, b) => b.score - a.score)[0];
  const oldManCounts = new Map<string, { total: number; doubled: number }>();
  rounds.filter((round) => round.type === 'lash').forEach((round) => { const oldMan = (round.input as LashRoundInput).oldMan; const current = oldManCounts.get(oldMan.eaterPlayerId) ?? { total: 0, doubled: 0 }; current.total += 1; if (oldMan.doubled) current.doubled += 1; oldManCounts.set(oldMan.eaterPlayerId, current); });
  const oldManLeader = [...oldManCounts].sort((a, b) => b[1].total - a[1].total)[0];
  const doubledLeader = [...oldManCounts].sort((a, b) => b[1].doubled - a[1].doubled)[0];
  const ranks = new Map<string, [number, number, number, number]>();
  rounds.filter((round) => round.type === 'trix-ranking').forEach((round) => (round.input as TrixRankingInput).finishingOrder.forEach((id, rank) => { const current = ranks.get(id) ?? [0, 0, 0, 0]; current[rank] += 1; ranks.set(id, current); }));
  const firstLeader = [...ranks].sort((a, b) => b[1][0] - a[1][0])[0];
  const fourthLeader = [...ranks].sort((a, b) => b[1][3] - a[1][3])[0];
  const kingdomScores = kingdomRecaps.flatMap((kingdom) => kingdom.delta.map((entry) => ({ ...entry, kingdom: kingdom.index + 1 })));
  const strongestKingdom = [...kingdomScores].sort((a, b) => b.score - a.score)[0];
  const weakestKingdom = [...kingdomScores].sort((a, b) => a.score - b.score)[0];
  const leadersByRound = rounds.filter((round) => round.type !== 'manual-adjustment').map((round) => { const entries = Object.entries(round.scoreAfter); const high = Math.max(...entries.map(([, score]) => score)); return entries.filter(([, score]) => score === high).map(([id]) => id); });
  const comeback = winnerIds.some((id) => leadersByRound.slice(0, -1).some((leaders) => !leaders.includes(id)));
  const winnerName = standings.filter((entry) => winnerIds.includes(entry.id)).map((entry) => entry.name).join(' و ');
  const loser = standings.at(-1);
  const values = { winner: winnerName, loser: loser?.name, margin, score: worstLash?.score, kingdom: strongestKingdom?.kingdom, player: oldManLeader ? game.players.find((player) => player.id === oldManLeader[0])?.name : undefined };

  const pools = new Map<string, SummarySegment[]>();
  segments.filter((segment) => segment.enabled).forEach((segment) => pools.set(segment.category, [...(pools.get(segment.category) ?? []), segment]));
  const neededCategories: SummarySegment['category'][] = ['opening', 'winner'];
  if (game.trixMode === 'partnership') neededCategories.push('partnership');
  if (game.gameType === 'trix-fast' && ranks.size) neededCategories.push('trix');
  if (kingdomScores.length) neededCategories.push('kingdom');
  if (oldManCounts.size) neededCategories.push('old-man');
  if (worstLash && worstLash.score <= -250) neededCategories.push('disaster');
  if (comeback) neededCategories.push('comeback');
  neededCategories.push('closing');
  const storyCategories = neededCategories.length > 7 ? [...neededCategories.slice(0, 6), 'closing' as const] : neededCategories;
  let chosen: SummarySegment[] = [];
  let signature = '';
  for (let attempt = 0; attempt < 80; attempt += 1) {
    chosen = storyCategories.flatMap((category, index) => {
      const pool = pools.get(category) ?? [];
      if (!pool.length) return [];
      return [pool[hash(`${game.id}-${category}-${attempt}-${index}`) % pool.length]];
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
    { signal: 'winner', subject: winnerName, relevant: Boolean(winnerName) }, { signal: 'loser', subject: loser?.name, relevant: standings.length > 1 },
    { signal: 'disaster', subject: worstLash?.name, relevant: Boolean(worstLash && worstLash.score <= -300) }, { signal: 'comeback', subject: winnerName, relevant: comeback },
    { signal: 'trix-master', subject: firstLeader ? game.players.find((player) => player.id === firstLeader[0])?.name : undefined, relevant: Boolean(firstLeader?.[1][0]) },
    { signal: 'trix-failure', subject: fourthLeader ? game.players.find((player) => player.id === fourthLeader[0])?.name : undefined, relevant: Boolean(fourthLeader?.[1][3]) },
    { signal: 'old-man', subject: oldManLeader ? game.players.find((player) => player.id === oldManLeader[0])?.name : undefined, relevant: Boolean(oldManLeader?.[1].total) },
    { signal: 'doubled-old-man', subject: doubledLeader ? game.players.find((player) => player.id === doubledLeader[0])?.name : undefined, relevant: Boolean(doubledLeader?.[1].doubled) },
    { signal: 'great-kingdom', subject: strongestKingdom?.name, relevant: Boolean(strongestKingdom) }, { signal: 'terrible-kingdom', subject: weakestKingdom?.name, relevant: Boolean(weakestKingdom) },
    { signal: game.gameType === 'cc' ? 'cc-master' : 'consistent', subject: winnerName, relevant: true }, { signal: game.gameType === 'cc' ? 'cc-disaster' : 'chaotic', subject: loser?.name, relevant: Boolean(loser) }
  ];
  const awardedTitles = titleSignals.filter((item) => item.relevant && item.subject).map((item, index) => {
    const pool = titles.filter((title) => title.enabled && title.signal === item.signal);
    const fresh = pool.filter((title) => !recentTitleIds.includes(title.id));
    const candidates = fresh.length ? fresh : pool;
    const title = candidates[hash(`${game.id}-${item.signal}-${index}`) % Math.max(1, candidates.length)];
    return title ? { id: title.id, title: title.template, subject: item.subject!, signal: item.signal } : undefined;
  }).filter((item): item is AwardedTitle => Boolean(item));
  return {
    gameId: game.id, standings, winnerIds, margin, kingdoms: kingdomRecaps, awards, titles: awardedTitles, story,
    stars: awards.filter((award) => award.tone === 'star').map((award) => `${award.title}: ${award.subject} — ${award.detail}`),
    roasts: awards.filter((award) => award.tone === 'roast').map((award) => `${award.title}: ${award.subject} — ${award.detail}`),
    signature, titleIds: awardedTitles.map((title) => title.id), comeback
  };
}

const SUMMARY_HISTORY_KEY = 'kok-fast-summary-history';
type SummaryHistoryEntry = { gameId: string; signature: string; titleIds: string[] };
export function readSummaryHistory(): SummaryHistoryEntry[] {
  try { const parsed = JSON.parse(localStorage.getItem(SUMMARY_HISTORY_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.slice(-50) : []; } catch { return []; }
}
export function rememberSummary(summary: FastSessionSummary): void {
  const history = readSummaryHistory().filter((entry) => entry.gameId !== summary.gameId);
  history.push({ gameId: summary.gameId, signature: summary.signature, titleIds: summary.titleIds });
  localStorage.setItem(SUMMARY_HISTORY_KEY, JSON.stringify(history.slice(-50)));
}
