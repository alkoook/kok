import { describe, expect, it } from 'vitest';
import type { GameSession, MessageRule } from '../../types';
import { effectiveMessageRules, factoryMessageRules, interpolateTemplate, matchingMessages, pickMessage, renderMessage } from './messages';

const players = [{ id: 'a', name: 'أحمد', seat: 0 }, { id: 'b', name: 'عمر', seat: 1 }, { id: 'c', name: 'علي', seat: 2 }, { id: 'd', name: 'زياد', seat: 3 }];
const teams = [{ id: 'x', name: 'أحمد وعلي', playerIds: ['a', 'c'] as [string, string] }, { id: 'y', name: 'عمر وزياد', playerIds: ['b', 'd'] as [string, string] }];
const game = (gameType: 'trix-fast' | 'cc', trixMode: 'partnership' | 'solo'): GameSession => ({ id: 'g', gameType, status: 'active', players, teams: trixMode === 'partnership' ? teams : undefined, trixMode, createdAt: '', updatedAt: '', currentRound: 0, scores: trixMode === 'partnership' ? { x: 0, y: 0 } : { a: 0, b: 0, c: 0, d: 0 }, rulesSnapshot: gameType === 'cc' ? { kind: 'cc-v3', version: 3 } : { kind: 'fast-trix-v5', version: 5 }, firstKingdomOwnerId: 'a' });

const partnershipLash = [
  [25, 'الملك {owner} ..حجي قوم مد الغالي بالقعدة خلي الشباب تاخد الرضا'], [0, 'عاااااش يا وحش الـ{absScore} ولا شي'], [-51, 'حلوة ودليل على فهم {owner}'],
  [-101, 'لا بأس حجي لا بأس مقبولة نوعاً ما'], [-201, 'شو الترتيب يابا شو هالنتيجة الخرا'], [-250, 'يلا انقسمت بيناتنا'],
  [-251, 'شو هاد حمار سبحان مين حجبك عن أكل التبن'], [-301, 'خراي عليك وعالشدة وعاللي مسكك ورق شدة وقلك بتفهم تلعب'],
  [-351, 'قوم ع بيتكن ايري فيك وباللي اتصل فيك وعزمك عالقعدة يلا حجي يلا ع بيتكن'], [-401, 'شوووووو هاللعب المأير هاد ع شوي رح توصل لمستوى منذر طبانة بالبهم'],
  [-451, 'اووووووووووووه لعب كلاب هاد مو لعب بني آدمين ...شو يا {owner} مو حاسس حالك حمار ...تريك ورق هالشدة وقوم شوف مستقبلك بغير مكان'],
  [-500, 'يا جماعة واضحة ......خلونا نقوم نعمل فرشاية لـ {owner} .....طيزو محجوزة لأبو عمر شفلك مكان تاني وغزو منو']
] as const;
const soloLash = partnershipLash.map(([score, message]) => [score, score === -101 ? 'خراي على هالمخ شو حمار' : score === -250 ? 'اكلت نص الشدة قوم انقلع ع بيتكن' : message] as const);
const trixMatrix = [
  [200, 150, 'جوني سنس وشريكو'], [200, 100, 'لعب معلمين هاد'], [200, 50, 'يلا شي بعوض شي'], [150, 200, 'جوني سنس وشريكو'],
  [150, 100, 'يلا مقبولة'], [150, 50, 'كس اخت هالتسماية'], [100, 200, 'ولله يا {owner} شريكك أفهم منك'], [100, 150, 'يلا مقبولة'],
  [100, 50, 'ورق خرا وشراكة ع أخرا'], [50, 200, 'معلم {partner} الله يعينك على هالحمار'],
  [50, 150, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة'], [50, 100, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة']
] as const;

describe('رسائل اللعب الحية canonical', () => {
  const rules = factoryMessageRules(); const owner = players[0];
  it.each(['trix-fast', 'cc'] as const)('يحمّل 12 رسالة شراكة و12 فردية فقط في %s', (gameType) => {
    for (const [score, expected] of partnershipLash) expect(matchingMessages(rules, { game: game(gameType, 'partnership'), owner, ownerScore: score }, 'lash-owner-score').map((rule) => rule.template)).toEqual([expected]);
    for (const [score, expected] of soloLash) expect(matchingMessages(rules, { game: game(gameType, 'solo'), owner, ownerScore: score }, 'lash-owner-score').map((rule) => rule.template)).toEqual([expected]);
  });
  it('يحمي مصفوفة التركس المؤلفة من 12 عبارة حرفيًا ومن دون بدائل مولدة', () => {
    for (const [ownerScore, partnerScore, expected] of trixMatrix) expect(matchingMessages(rules, { game: game('trix-fast', 'partnership'), owner, ownerScore, partnerScore }, 'trix-partnership').map((rule) => rule.template)).toEqual([expected]);
    expect(rules.filter((rule) => rule.event === 'trix-partnership')).toHaveLength(12);
  });
  it('يبقي حوض الختيار الإبداعي مع العبارتين الإجباريتين ومدتهما', () => {
    const oldMan = rules.filter((rule) => rule.category === 'old-man');
    expect(oldMan).toHaveLength(120);
    expect(oldMan).toContainEqual(expect.objectContaining({ template: 'ملط الختيار ملط يلحس ايري', durationMs: 5000 }));
    expect(oldMan).toContainEqual(expect.objectContaining({ template: 'ولد راح لعند أبوه وقلو ...بابا ناكوني بالحارة ....قلو الأب أسهل ما تاكل الختيار مدبل بمملكتك متل هالحمار {owner}', durationMs: 10000 }));
  });
  it('يحتفظ بعشرة نجاحات و16 فشلًا وخمس إضافات طرنيب', () => { expect(rules.filter((rule) => /^success-\d+$/.test(rule.id))).toHaveLength(10); expect(rules.filter((rule) => /^failure-\d+$/.test(rule.id))).toHaveLength(16); expect(rules.filter((rule) => /^failure-private-\d+$/.test(rule.id))).toHaveLength(5); expect(['kaboot', 'broken-seven', 'second-kaboot', 'success-streak-3', 'success-streak-5', 'failure-streak-3'].every((id) => rules.some((rule) => rule.id === id))).toBe(true); });
  it('يستبدل القيم المعروفة ويبقي المجهولة بأمان', () => expect(interpolateTemplate('{owner} {absScore} {unknown}', { owner: 'أحمد', absScore: 250 })).toBe('أحمد 250 {unknown}'));
  it('يقرأ الشريك والفريق المنافس في القالب', () => { const rule = { ...matchingMessages(rules, { game: game('trix-fast', 'partnership'), owner, ownerScore: 50, partnerScore: 200 }, 'trix-partnership')[0], template: '{owner}/{partner}/{team}/{opponentTeam}' }; expect(renderMessage(rule, { game: game('trix-fast', 'partnership'), owner, ownerScore: 50, partnerScore: 200 })).toBe('أحمد/علي/أحمد وعلي/عمر وزياد'); });
  it('يمنع الرسالة الحديثة ويعود بأمان عند نفاد الحوض', () => { const pool = rules.filter((rule) => rule.category === 'old-man').slice(0, 3); const picked = pickMessage(pool, [pool[0].id, pool[1].id], () => 0); expect(picked?.id).toBe(pool[2].id); expect(pickMessage([pool[0]], [pool[0].id], () => 0)?.id).toBe(pool[0].id); });
  it('طبقة التعديل لا تغيّر المصنع ولا تعيد قواعد Codex القديمة', () => { const original = rules.find((rule) => rule.id === 'fast-lash-partnership-positive')!; const obsolete = { ...original, id: 'fast-lash-positive-2', factoryId: 'fast-lash-positive-2', template: 'بديل مولد قديم' } satisfies MessageRule; const effective = effectiveMessageRules([{ ...original, template: 'معدلة' }, obsolete]); expect(effective.find((rule) => rule.id === original.id)?.template).toBe('معدلة'); expect(effective.some((rule) => rule.id === obsolete.id)).toBe(false); expect(factoryMessageRules().find((rule) => rule.id === original.id)?.template).toBe(partnershipLash[0][1]); });
});
