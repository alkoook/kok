import { describe, expect, it } from 'vitest';
import { LIKHA_REACTION_COUNT, selectLikhaReaction } from './reactions';
import type { LikhaRoundInput } from './types';

const input: LikhaRoundInput = { players: ['a', 'b', 'c', 'd'].map((playerId, index) => ({ playerId, heartsCount: index === 0 ? 13 : 0 })), specialCards: { jackDiamonds: { capturedBy: 'a', doubled: true }, queenSpades: { capturedBy: 'b', doubled: true }, kingClubs: { capturedBy: 'c', doubled: true }, tenDiamonds: { capturedBy: 'd', doubled: true } } };

describe('Likha reactions', () => {
  it('ships more than forty dedicated messages', () => expect(LIKHA_REACTION_COUNT).toBeGreaterThanOrEqual(40));
  it('selects the doubled queen before every other event', () => expect(selectLikhaReaction(input, { a: -35, b: -26, c: -28, d: 20 }).event).toBe('queen-doubled'));
  it('does not immediately repeat the same message when alternatives exist', () => { const first = selectLikhaReaction(input, {}); expect(selectLikhaReaction(input, {}, first.id).id).not.toBe(first.id); });
  it('keeps one reaction but adds partnership context', () => expect(selectLikhaReaction(input, {}, undefined, 'سامر').message).toContain('سامر'));
});
