import { describe, expect, it } from 'vitest';
import type { ConditionalReactionRule, ConditionalRuleCondition, ConditionalRuleFiring } from '../../types';
import { interpolateTemplate } from '../fast/messages';
import { ruleMatches, selectConditionalReaction, validateConditionalRule, type ConditionalReactionContext } from './conditionalRules';

const condition = (field: ConditionalRuleCondition['field'], operator: ConditionalRuleCondition['operator'], value: ConditionalRuleCondition['value'], valueTo?: number): ConditionalRuleCondition => ({ id: `${field}-${operator}`, field, operator, value, valueTo });
const rule = (changes: Partial<ConditionalReactionRule> = {}): ConditionalReactionRule => ({
  id: 'rule-1', name: 'قاعدة', enabled: true, game: 'trix-fast', event: 'lash', conditions: [condition('ownerTeamScore', 'lte', -300)],
  messages: [{ id: 'message-a', text: 'خاص {owner} {score}', enabled: true }], durationMs: 5000, priority: 50, exclusive: false,
  oncePerMatch: false, cooldownRounds: 0, order: 1, createdAt: '2026-10-03T00:00:00.000Z', updatedAt: '2026-10-03T00:00:00.000Z', ...changes
});
const context = (changes: Partial<ConditionalReactionContext> = {}): ConditionalReactionContext => ({
  gameId: 'game-1', game: 'trix-fast', event: 'lash', roundIndex: 4, intensity: 4,
  values: { gameMode: 'partnership', ownerTeamScore: -350, enteredTeamScore: -350 }, placeholders: { owner: 'أحمد', score: -350 },
  actorProfileId: 'profile-a', participantProfileIds: ['profile-a', 'profile-b'], ownerTeamProfileIds: ['profile-a'], opponentTeamProfileIds: ['profile-b'], ...changes
});
const firing = (changes: Partial<ConditionalRuleFiring> = {}): ConditionalRuleFiring => ({ id: 'firing-1', ruleId: 'rule-1', gameId: 'game-1', event: 'lash', alternativeId: 'message-a', roundIndex: 2, firedAt: '2026-10-03T00:00:00.000Z', ...changes });

describe('محرك الرسائل المشروطة', () => {
  it('يطابق قاعدة نتيجة بسيطة', () => expect(ruleMatches(rule(), context())).toBe(true));
  it('يطابق المجال شمولياً', () => expect(ruleMatches(rule({ conditions: [condition('ownerTeamScore', 'between', -400, -300)] }), context())).toBe(true));
  it('يتطلب تحقق كل شروط AND', () => {
    const candidate = rule({ conditions: [condition('ownerTeamScore', 'lte', -300), condition('gameMode', 'eq', 'solo')] });
    expect(ruleMatches(candidate, context())).toBe(false);
  });
  it('يطابق هوية اللاعب الدائم لا الاسم', () => {
    const candidate = rule({ event: 'old-man', conditions: [condition('targetProfileId', 'eq', 'profile-a')] });
    expect(ruleMatches(candidate, context({ event: 'old-man' }))).toBe(true);
    expect(ruleMatches(candidate, context({ event: 'old-man', actorProfileId: 'profile-b' }))).toBe(false);
  });
  it('يدعم وجود اللاعب الدائم في فريق المالك أو عدم وجوده', () => {
    expect(ruleMatches(rule({ conditions: [condition('ownerTeamProfileId', 'eq', 'profile-a')] }), context())).toBe(true);
    expect(ruleMatches(rule({ conditions: [condition('ownerTeamProfileId', 'neq', 'profile-b')] }), context())).toBe(true);
  });
  it('تتقدم الحصرية حتى على أولوية أعلى غير حصرية', () => {
    const exclusive = rule({ id: 'exclusive', exclusive: true, priority: 10 });
    const ordinary = rule({ id: 'ordinary', priority: 100 });
    expect(selectConditionalReaction([ordinary, exclusive], context(), [])?.rule.id).toBe('exclusive');
  });
  it('يرتب بالأولوية ثم التخصص ثم الترتيب الحتمي', () => {
    const generic = rule({ id: 'generic', priority: 60, order: 1 });
    const specific = rule({ id: 'specific', priority: 60, order: 9, conditions: [...generic.conditions, condition('gameMode', 'eq', 'partnership')] });
    expect(selectConditionalReaction([generic, specific], context(), [])?.rule.id).toBe('specific');
    const first = rule({ id: 'first', priority: 70, order: 1 }); const second = rule({ id: 'second', priority: 70, order: 2 });
    expect(selectConditionalReaction([second, first], context(), [])?.rule.id).toBe('first');
  });
  it('يحترم مرة واحدة بالقعدة عبر سجل محفوظ', () => expect(selectConditionalReaction([rule({ oncePerMatch: true })], context(), [firing()])).toBeUndefined());
  it('يحترم حماية التكرار بالجولات', () => {
    expect(selectConditionalReaction([rule({ cooldownRounds: 2 })], context(), [firing({ roundIndex: 2 })])).toBeUndefined();
    expect(selectConditionalReaction([rule({ cooldownRounds: 1 })], context(), [firing({ roundIndex: 2 })])).toBeDefined();
  });
  it('لا يطابق القاعدة المعطلة', () => expect(selectConditionalReaction([rule({ enabled: false })], context(), [])).toBeUndefined());
  it('يختار من البدائل المفعلة فقط', () => {
    const selected = selectConditionalReaction([rule({ messages: [{ id: 'off', text: 'لا', enabled: false }, { id: 'on', text: 'نعم', enabled: true }] })], context(), [], () => 0);
    expect(selected?.alternative.id).toBe('on');
  });
  it('لا يكرر البديل السابق مباشرة', () => {
    const candidate = rule({ messages: [{ id: 'message-a', text: 'أ', enabled: true }, { id: 'message-b', text: 'ب', enabled: true }] });
    expect(selectConditionalReaction([candidate], context(), [firing()], () => 0)?.alternative.id).toBe('message-b');
  });
  it('يستبدل placeholders ويبقي المجهول آمناً', () => expect(interpolateTemplate('{owner} {score} {unknown}', context().placeholders)).toBe('أحمد -350 {unknown}'));
  it('يطابق ضمان طرنيب وسلسلة الفشل', () => {
    const candidate = rule({ game: 'tarneeb-61', event: 'tarneeb', conditions: [condition('bid', 'gte', 10), condition('failureStreak', 'gte', 3)] });
    expect(ruleMatches(candidate, context({ game: 'tarneeb-61', event: 'tarneeb', values: { bid: 10, failureStreak: 3 } }))).toBe(true);
  });
  it('يطابق الختيار المدبل وصاحب المملكة', () => {
    const candidate = rule({ event: 'old-man', conditions: [condition('oldManDoubled', 'eq', true), condition('ownerAteOldMan', 'eq', true)] });
    expect(ruleMatches(candidate, context({ event: 'old-man', values: { oldManDoubled: true, ownerAteOldMan: true } }))).toBe(true);
  });
  it('يرفض حقلاً من لعبة أخرى ويكشف التناقض العددي', () => {
    expect(validateConditionalRule(rule({ conditions: [condition('bid', 'eq', 7)] }))).toContain('الشرط bid غير متاح لهذا الحدث');
    const errors = validateConditionalRule(rule({ conditions: [condition('ownerTeamScore', 'lt', -300), condition('ownerTeamScore', 'gt', 0)] }));
    expect(errors.some((error) => error.includes('متناقضة'))).toBe(true);
  });
});
