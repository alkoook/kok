import { describe, expect, it } from 'vitest';
import { getContextualTarneeb61Reaction, getTarneeb61Reaction, pickRandomMessage } from './reactions';

describe('تعليقات جولات طرنيب 61', () => {
  it('يعطي انكسار ضمان 7 الأولوية العليا', () => {
    const reaction = getTarneeb61Reaction({ bid: 7, actualTricks: 6, contractSucceeded: false });
    expect(reaction.variant).toBe('broken-seven');
    expect(reaction.message).toContain('ضمنت 7 وانكسرت');
    expect(reaction.durationMs).toBe(11000);
  });

  it('يعرض تعليق الكبوت لكل ضمان يجلب 13 لطش', () => {
    expect(getTarneeb61Reaction({ bid: 8, actualTricks: 13, contractSucceeded: true })).toMatchObject({ variant: 'kaboot', badge: '13 / 13' });
    expect(getTarneeb61Reaction({ bid: 13, actualTricks: 13, contractSucceeded: true }).message).toBe('سجل كبووووود للملك ✌️🖤');
  });

  it('لا يحول نتيجة غير ناجحة إلى كبوت اعتمادًا على الرقم وحده', () => {
    expect(getTarneeb61Reaction({ bid: 8, actualTricks: 13, contractSucceeded: false }).variant).toBe('failure');
  });

  it('يميز النجاح العادي عن الفشل', () => {
    expect(getTarneeb61Reaction({ bid: 11, actualTricks: 11, contractSucceeded: true }, undefined, () => 0).variant).toBe('success');
    expect(getTarneeb61Reaction({ bid: 11, actualTricks: 10, contractSucceeded: false }, undefined, () => 0).variant).toBe('failure');
    expect(getTarneeb61Reaction({ bid: 7, actualTricks: 7, contractSucceeded: true }, undefined, () => 0).variant).toBe('success');
  });

  it('لا يكرر تعليق النجاح أو الفشل مباشرة', () => {
    const success = getTarneeb61Reaction({ bid: 8, actualTricks: 8, contractSucceeded: true }, undefined, () => 0);
    const nextSuccess = getTarneeb61Reaction({ bid: 8, actualTricks: 9, contractSucceeded: true }, success.id, () => 0);
    const failure = getTarneeb61Reaction({ bid: 8, actualTricks: 6, contractSucceeded: false }, undefined, () => 0);
    const nextFailure = getTarneeb61Reaction({ bid: 9, actualTricks: 6, contractSucceeded: false }, failure.id, () => 0);
    expect(nextSuccess.id).not.toBe(success.id);
    expect(nextFailure.id).not.toBe(failure.id);
  });

  it('لا يكرر الرسالة مرتين متتاليتين عند توفر بديل', () => {
    const messages = [{ id: 'one', message: '1' }, { id: 'two', message: '2' }];
    expect(pickRandomMessage(messages, 'one', () => 0).id).toBe('two');
  });

  it('يعرض reactions سياقية من history الحقيقي ويحافظ على أولوية 7', () => {
    const attempt = (id: string, succeeded: boolean, actualTricks = succeeded ? 8 : 6) => ({ roundId: id, roundIndex: Number(id.slice(1)), playerId: 'p1', teamId: 'a', bid: 7, actualTricks, succeeded, occurredAt: '2026-08-29T10:00:00Z' });
    const successes = [attempt('r0', true), attempt('r1', true), attempt('r2', true)];
    expect(getContextualTarneeb61Reaction({ playerId: 'p1', bid: 7, actualTricks: 8, contractSucceeded: true }, successes).id).toBe('success-streak-3');
    const failures = [attempt('r0', false), attempt('r1', false), attempt('r2', false)];
    expect(getContextualTarneeb61Reaction({ playerId: 'p1', bid: 7, actualTricks: 6, contractSucceeded: false }, failures).variant).toBe('broken-seven');
  });

  it('يميز الكبوت الثاني ويهمل round ID المكرر في analytics', () => {
    const attempts = [{ roundId: 'r1', roundIndex: 0, playerId: 'p1', teamId: 'a', bid: 10, actualTricks: 13, succeeded: true, occurredAt: '2026-08-29T10:00:00Z' }, { roundId: 'r2', roundIndex: 1, playerId: 'p1', teamId: 'a', bid: 11, actualTricks: 13, succeeded: true, occurredAt: '2026-08-29T10:01:00Z' }];
    expect(getContextualTarneeb61Reaction({ playerId: 'p1', bid: 11, actualTricks: 13, contractSucceeded: true }, attempts).id).toBe('second-kaboot');
  });

  it('يعطي سلسلة 5 أولوية على سلسلة 3 ويكشف ثلاثة انكسارات عادية', () => {
    const success = Array.from({ length: 5 }, (_, index) => ({ roundId: `s${index}`, roundIndex: index, playerId: 'p1', teamId: 'a', bid: 8, actualTricks: 8, succeeded: true, occurredAt: '2026-08-29T10:00:00Z' }));
    expect(getContextualTarneeb61Reaction({ playerId: 'p1', bid: 8, actualTricks: 8, contractSucceeded: true }, success).id).toBe('success-streak-5');
    const failure = Array.from({ length: 3 }, (_, index) => ({ roundId: `f${index}`, roundIndex: index, playerId: 'p1', teamId: 'a', bid: 8, actualTricks: 6, succeeded: false, occurredAt: '2026-08-29T10:00:00Z' }));
    expect(getContextualTarneeb61Reaction({ playerId: 'p1', bid: 8, actualTricks: 6, contractSucceeded: false }, failure).id).toBe('failure-streak-3');
  });
});
