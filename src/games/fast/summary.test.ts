import { describe, expect, it } from 'vitest';
import type { GameRound, GameSession } from '../../types';
import { buildFastSessionSummary } from './summary';
import { FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES, SUMMARY_CONTENT_COUNTS, effectiveSummaryContent } from './summaryContent';

const players = ['أحمد', 'عمر', 'علي', 'زياد'].map((name, seat) => ({ id: `p${seat + 1}`, name, seat }));
const teams = [{ id: 'a', name: 'أحمد وعلي', playerIds: ['p1', 'p3'] as [string, string] }, { id: 'b', name: 'عمر وزياد', playerIds: ['p2', 'p4'] as [string, string] }];
const game: GameSession = { id: 'summary-game', gameType: 'trix-fast', status: 'completed', players, teams, trixMode: 'partnership', createdAt: '', updatedAt: '', currentRound: 8, scores: { a: 220, b: -220 }, rulesSnapshot: { kind: 'fast-trix-v4', version: 4 }, firstKingdomOwnerId: 'p1', winnerIds: ['a'] };
const rounds: GameRound[] = Array.from({ length: 8 }, (_, index) => {
  const lash = index % 2 === 0; const kingdomIndex = Math.floor(index / 2); const delta = lash ? { a: -180, b: -320 } : { a: 300, b: 200 };
  return { id: `r${index}`, gameId: game.id, index, kingdomIndex, kingdomOwnerId: players[kingdomIndex].id, type: lash ? 'lash' : 'trix-ranking', input: lash ? { kind: 'lash-partnership', scoresByTeam: delta, oldMan: { eaterPlayerId: players[kingdomIndex].id, doubled: index === 4 } } : { kind: 'trix-ranking', finishingOrder: ['p1', 'p2', 'p3', 'p4'] }, scoreDelta: delta, scoreAfter: index === 7 ? game.scores : delta, createdAt: '' } as GameRound;
});

describe('محرك ملخصات Fast وCC', () => {
  it('يشحن الحد الأدنى من المحتوى و128 لقبًا', () => expect(SUMMARY_CONTENT_COUNTS).toEqual({ opening: 40, winner: 60, disaster: 80, partnership: 40, trix: 40, kingdom: 40, oldMan: 40, comeback: 30, closing: 40, titles: 128 }));
  it('يبني قصة من أحداث حقيقية ويعرض لطش الفريق بلا تقسيم فردي', () => { const summary = buildFastSessionSummary(game, rounds, FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES); expect(summary.story.length).toBeGreaterThanOrEqual(3); expect(summary.story.length).toBeLessThanOrEqual(7); expect(summary.kingdoms[0].lash.map((entry) => entry.name)).toEqual(['أحمد وعلي', 'عمر وزياد']); expect(summary.awards.find((award) => award.id === 'worst-lash')?.subject).toBe('عمر وزياد'); });
  it('يستبعد المقاطع غير المرتبطة عند غياب الحدث', () => { const quiet = buildFastSessionSummary({ ...game, gameType: 'cc' }, rounds.filter((round) => round.type === 'lash'), FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES); expect(quiet.story.some((line) => line.includes('التركس'))).toBe(false); });
  it('يتجنب نفس توقيع التركيب ضمن التاريخ الحديث', () => { const first = buildFastSessionSummary(game, rounds, FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES); const second = buildFastSessionSummary(game, rounds, FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES, [first.signature]); expect(second.signature).not.toBe(first.signature); });
  it('تغيير الأسماء وحده لا يصنع توقيع قالب جديد', () => { const first = buildFastSessionSummary(game, rounds, FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES); const renamed = buildFastSessionSummary({ ...game, players: game.players.map((player) => ({ ...player, name: `جديد ${player.seat}` })) }, rounds, FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES); expect(renamed.signature).toBe(first.signature); });
  it('يتعامل مع المحتوى الفارغ والمعطل من دون فشل', () => { const summary = buildFastSessionSummary(game, rounds, [], []); expect(summary.story).toEqual([]); expect(summary.titles).toEqual([]); });
  it('يستخدم التعديل المحلي ويستبعد المعطل ويحذف أثره عند الاستعادة', () => { const factory = FACTORY_SUMMARY_SEGMENTS[0]; const edited = effectiveSummaryContent([{ id: factory.id, factoryId: factory.id, category: factory.category, template: 'افتتاحية معدلة', enabled: false, updatedAt: '' }]); expect(edited.segments.find((item) => item.id === factory.id)).toMatchObject({ template: 'افتتاحية معدلة', enabled: false }); const generated = buildFastSessionSummary(game, rounds, edited.segments.filter((item) => item.category === 'opening'), edited.titles); expect(generated.signature).not.toContain(factory.id); expect(effectiveSummaryContent([]).segments.find((item) => item.id === factory.id)?.template).toBe(factory.template); });
  it('يتجنب اللقب الحديث عندما تتوفر بدائل', () => { const firstWinner = FACTORY_TITLES.find((title) => title.signal === 'winner')!; const summary = buildFastSessionSummary(game, rounds, FACTORY_SUMMARY_SEGMENTS, FACTORY_TITLES, [], [firstWinner.id]); expect(summary.titles.find((title) => title.signal === 'winner')?.id).not.toBe(firstWinner.id); });
});
