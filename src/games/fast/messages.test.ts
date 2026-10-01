import { describe, expect, it } from 'vitest';
import type { GameSession } from '../../types';
import { factoryMessageRules, interpolateTemplate, matchingMessages, pickMessage, renderMessage } from './messages';

const game: GameSession = { id: 'g', gameType: 'trix-fast', status: 'active', players: [{ id: 'a', name: 'أحمد', seat: 0 }, { id: 'b', name: 'عمر', seat: 1 }, { id: 'c', name: 'علي', seat: 2 }, { id: 'd', name: 'زياد', seat: 3 }], teams: [{ id: 'x', name: 'أ', playerIds: ['a', 'c'] }, { id: 'y', name: 'ب', playerIds: ['b', 'd'] }], createdAt: '', updatedAt: '', currentRound: 0, scores: {}, rulesSnapshot: { kind: 'fast-trix-v3', version: 3 }, firstKingdomOwnerId: 'a' };

describe('محرك رسائل القعدة', () => {
  const rules = factoryMessageRules(); const owner = game.players[0];
  it.each([25, 5, 0, -1, -50, -51, -100, -101, -200, -201, -249, -250, -251, -300, -301, -350, -351, -400, -401, -450, -451, -499, -500, -550])('يطابق %i نطاق لطش واحدًا فقط', (ownerScore) => expect(matchingMessages(rules, { game, owner, ownerScore }, 'lash-owner-score')).toHaveLength(1));
  it('يحفظ الاستثناء -250 والنطاق <= -500', () => { expect(matchingMessages(rules, { game, owner, ownerScore: -250 }, 'lash-owner-score')[0].id).toContain('exact-250'); expect(matchingMessages(rules, { game, owner, ownerScore: -550 }, 'lash-owner-score')[0].id).toContain('500-or-less'); });
  it('يستبدل القيم المعروفة ويبقي المجهولة بأمان', () => expect(interpolateTemplate('{owner} {absScore} {unknown}', { owner: 'أحمد', absScore: 250 })).toBe('أحمد 250 {unknown}'));
  it('يقرأ شريك صاحب المملكة في رسالة التركس', () => { const rule = matchingMessages(rules, { game, owner, ownerScore: 50, partnerScore: 200 }, 'trix-partnership')[0]; expect(renderMessage(rule, { game, owner, ownerScore: 50, partnerScore: 200 })).toContain('علي'); });
  it('لا يكرر الخيار السابق عند وجود بديل', () => { const pool = rules.filter((rule) => rule.category === 'tarneeb-break'); const selected = pickMessage(pool, pool[0].id, () => 0); expect(selected?.id).not.toBe(pool[0].id); });
  it('رسالة الختيار المدبل مدتها عشر ثوان', () => expect(rules.find((rule) => rule.id === 'old-man-owner-doubled')?.durationMs).toBe(10000));
});
