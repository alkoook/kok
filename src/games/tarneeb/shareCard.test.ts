import { describe, expect, it } from 'vitest';
import type { GameSession } from '../../types';
import { TARNEEB_61_RULES_V2 } from './rules';
import { buildTarneeb61SessionSummary } from './analytics';
import { buildTarneebShareCardModel } from './shareCard';

describe('بطاقة مشاركة ملخص القعدة', () => {
  it('يبني محتوى البطاقة من الملخص الحقيقي دون شبكة', () => {
    const game: GameSession = { id: 'share', gameType: 'tarneeb-61', status: 'completed', players: [{ id: '1', name: 'زياد', seat: 0 }, { id: '2', name: 'أحمد', seat: 1 }, { id: '3', name: 'محمد', seat: 2 }, { id: '4', name: 'سامر', seat: 3 }], teams: [{ id: 'a', name: 'A', playerIds: ['1', '3'] }, { id: 'b', name: 'B', playerIds: ['2', '4'] }], createdAt: '2026-08-29T10:00:00Z', updatedAt: '2026-08-29T11:00:00Z', finishedAt: '2026-08-29T11:00:00Z', currentRound: 0, scores: { a: 61, b: 48 }, winnerIds: ['a'], rulesVersion: 2, rulesSnapshot: { kind: 'tarneeb-61-v2', version: 2, rules: TARNEEB_61_RULES_V2 } };
    const model = buildTarneebShareCardModel(buildTarneeb61SessionSummary(game, []));
    expect(model).toMatchObject({ winner: 'زياد + محمد', score: '61 — 48', rounds: '0 جولة' });
  });
});
