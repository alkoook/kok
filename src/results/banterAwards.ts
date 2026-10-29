import type { GameRound, GameSession, LikhaRoundInput, Tarneeb41RoundInput } from '../types';
import { buildTarneeb61Attempts } from '../games/tarneeb/analytics';
import { buildOfficialStandings } from './standings';

export type BanterAwardId = 'donkey-dick' | 'dog-ass' | 'sheep-cunt' | 'my-ass-cheek' | 'the-shit';
export type BanterAward = { id: BanterAwardId; emoji: string; title: string; playerId: string; reason: string; severity: number };
type Metric = { score: number; failures: number; doubledQueen: number; queens: number; worstRound?: number; negativeSpecials: number; reasons: string[] };

const metricMap = (game: GameSession) => new Map(game.players.map((player) => [player.id, { score: 0, failures: 0, doubledQueen: 0, queens: 0, negativeSpecials: 0, reasons: [] } as Metric]));
const playerName = (game: GameSession, id: string) => game.players.find((player) => player.id === id)?.name ?? id;

export function calculateGameBanterAwards(game: GameSession, allRounds: GameRound[]): BanterAward[] {
  const rounds = allRounds.filter((round) => round.gameId === game.id && round.type !== 'manual-adjustment');
  const metrics = metricMap(game);
  const hit = (id: string, points: number, reason?: string) => { const item = metrics.get(id); if (!item) return; item.score += points; if (reason) item.reasons.push(reason); };
  rounds.forEach((round) => Object.entries(round.scoreDelta).forEach(([id, value]) => { const item = metrics.get(id); if (item) item.worstRound = Math.min(item.worstRound ?? value, value); }));
  if (game.gameType === 'tarneeb-61') buildTarneeb61Attempts(game, rounds).filter((attempt) => !attempt.succeeded).forEach((attempt) => { const item = metrics.get(attempt.playerId); if (!item) return; item.failures += 1; hit(attempt.playerId, attempt.bid === 7 ? 14 : 8, `انكسر بضمان ${attempt.bid}`); });
  if (game.gameType === 'tarneeb-41') rounds.filter((round) => round.type === 'tarneeb-41').forEach((round) => (round.input as Tarneeb41RoundInput).entries.filter((entry) => !entry.success).forEach((entry) => { const item = metrics.get(entry.playerId); if (!item) return; item.failures += 1; hit(entry.playerId, entry.bid >= 9 ? 9 : 5, `انكسر بضمان ${entry.bid}`); }));
  if (game.gameType === 'likha') rounds.filter((round) => round.type === 'likha').forEach((round) => {
    const input = round.input as LikhaRoundInput;
    const queen = metrics.get(input.specialCards.queenSpades.capturedBy); if (queen) { queen.queens += 1; queen.negativeSpecials += 1; if (input.specialCards.queenSpades.doubled) queen.doubledQueen += 1; hit(input.specialCards.queenSpades.capturedBy, input.specialCards.queenSpades.doubled ? 16 : 8, input.specialCards.queenSpades.doubled ? 'أكل بنت مدبلة' : 'أكل بنت البستوني'); }
    for (const card of ['kingClubs', 'jackDiamonds'] as const) { const capture = input.specialCards[card]; const item = metrics.get(capture.capturedBy); if (item) item.negativeSpecials += 1; hit(capture.capturedBy, (card === 'kingClubs' ? 6 : 5) * (capture.doubled ? 2 : 1)); }
    input.players.forEach((entry) => hit(entry.playerId, Math.floor(entry.heartsCount / 4)));
  });
  if (game.gameType === 'cc' || game.gameType === 'trix-fast') rounds.forEach((round) => { if (round.type !== 'lash' || !('oldMan' in round.input)) return; const oldMan = round.input.oldMan; hit(oldMan.eaterPlayerId, oldMan.doubled ? 8 : 4, oldMan.doubled ? 'أكل الختيار مدبل' : 'أكل الختيار'); });

  const awards: BanterAward[] = []; const rows = [...metrics.entries()];
  const self = [...rows].sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))[0];
  if (self && self[1].score >= 5) awards.push({ id: 'donkey-dick', emoji: '🐴', title: 'إير الحمار', playerId: self[0], reason: self[1].failures ? `${self[1].failures} انكسارات${self[1].reasons[0] ? `، ${self[1].reasons[0]}` : ''}` : self[1].reasons[0] ?? `مؤشر تدمير ذاتي ${self[1].score}`, severity: self[1].score });
  const disaster = [...rows].filter(([, item]) => item.worstRound !== undefined && item.worstRound < 0).sort((a, b) => (a[1].worstRound ?? 0) - (b[1].worstRound ?? 0))[0];
  if (disaster && (disaster[1].worstRound ?? 0) <= -20) awards.push({ id: 'dog-ass', emoji: '🐕', title: 'طيز الكلب', playerId: disaster[0], reason: `${disaster[1].worstRound} بجولة واحدة`, severity: Math.abs(disaster[1].worstRound ?? 0) });
  if (game.gameType === 'likha') { const queen = [...rows].filter(([, item]) => item.queens > 0).sort((a, b) => b[1].doubledQueen - a[1].doubledQueen || b[1].queens - a[1].queens)[0]; if (queen) awards.push({ id: 'sheep-cunt', emoji: '🐑', title: 'كس النعجة', playerId: queen[0], reason: `أكل بنت البستوني ${queen[1].queens} مرة${queen[1].doubledQueen ? `، ${queen[1].doubledQueen} مدبلة` : ''}`, severity: queen[1].queens * 8 + queen[1].doubledQueen * 8 }); }
  const standings = buildOfficialStandings(game); const last = standings.at(-1); const first = standings[0];
  if (rounds.length > 0 && last && first && last.score < first.score) { const losers = last.playerIds.length ? last.playerIds : [last.id]; const worst = losers.map((id) => [id, metrics.get(id)] as const).sort((a, b) => (b[1]?.score ?? 0) - (a[1]?.score ?? 0))[0]; if (worst) awards.push({ id: 'my-ass-cheek', emoji: '🍑', title: 'فردة طيزي', playerId: worst[0], reason: `أنهى القعدة أخيراً بفارق ${first.score - last.score}`, severity: first.score - last.score }); }
  const overall = [...rows].filter(([id, item]) => item.score >= 18 && [item.failures > 0, (item.worstRound ?? 0) <= -20, item.negativeSpecials >= 2, standings.at(-1)?.playerIds.includes(id) ?? false].filter(Boolean).length >= 3).sort((a, b) => b[1].score - a[1].score)[0];
  if (overall) awards.push({ id: 'the-shit', emoji: '💩', title: 'الخرية', playerId: overall[0], reason: `${overall[1].failures} انكسارات و${overall[1].negativeSpecials} ورقات سلبية وأسوأ جولة ${overall[1].worstRound ?? 0}`, severity: overall[1].score + 20 });
  return awards.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id)).map((award) => ({ ...award, reason: `${playerName(game, award.playerId)}: ${award.reason}` }));
}
