import type { Tarneeb61Attempt } from './analytics';

export type Tarneeb61ReactionVariant = 'success' | 'failure' | 'kaboot' | 'broken-seven';

export type Tarneeb61Reaction = {
  id: string;
  message: string;
  variant: Tarneeb61ReactionVariant;
  durationMs: number;
  badge?: string;
};

export type Tarneeb61ReactionContext = {
  bid: number;
  actualTricks: number;
  contractSucceeded: boolean;
};

export type ReactionMessage = Pick<Tarneeb61Reaction, 'id' | 'message'>;

export const TARNEEB_SUCCESS_MESSAGES: ReactionMessage[] = [
  { id: 'success-1', message: 'ضمان ناجح ولعب مرتب.' }, { id: 'success-2', message: 'ضمن وحقق المطلوب.' },
  { id: 'success-3', message: 'جولة قوية وواضحة.' }, { id: 'success-4', message: 'أداء يليق بملك الـ61.' },
  { id: 'success-5', message: 'الضمان كان في مكانه.' }, { id: 'success-6', message: 'قراءة موفقة للجولة.' },
  { id: 'success-7', message: 'النتيجة أكدت صحة القرار.' }, { id: 'success-8', message: 'ضمان نظيف من البداية للنهاية.' },
  { id: 'success-9', message: 'حقق الضمان بثبات.' }, { id: 'success-10', message: 'أفضل أداء في هذه الجولة.' }
];

export const TARNEEB_FAILURE_MESSAGES: ReactionMessage[] = [
  { id: 'failure-1', message: 'الضمان لم ينجح هذه المرة.' }, { id: 'failure-2', message: 'القرار كان جريئاً والنتيجة لم تساعد.' },
  { id: 'failure-3', message: 'جولة تحتاج مراجعة.' }, { id: 'failure-4', message: 'فارق بسيط قلب نتيجة الضمان.' },
  { id: 'failure-5', message: 'الشريك كان يتمنى نتيجة أفضل.' }, { id: 'failure-6', message: 'الورق لم يخدم هذا القرار.' },
  { id: 'failure-7', message: 'محاولة قوية لكنها لم تكتمل.' }, { id: 'failure-8', message: 'الـ61 لا تسامح مع الضمان الناقص.' },
  { id: 'failure-9', message: 'التوقيت لم يكن موفقاً.' }, { id: 'failure-10', message: 'الضمان أكبر من حصيلة الجولة.' },
  { id: 'failure-11', message: 'النتيجة قالت كلمتها.' }, { id: 'failure-12', message: 'هذه الجولة لم تكن موفقة.' },
  { id: 'failure-13', message: 'تعثر واضح في الضمان.' }, { id: 'failure-14', message: 'القرار يحتاج حساباً أدق.' },
  { id: 'failure-15', message: 'تنتهي الجولة وتبقى فرصة التعويض.' }, { id: 'failure-16', message: 'ضمان صعب ونتيجة أصعب.' }
];

export const TARNEEB_PRIVATE_FAILURE_MESSAGES: ReactionMessage[] = [
  { id: 'failure-private-1', message: 'انكسر الضمان بفارق واضح.' }, { id: 'failure-private-2', message: 'القعدة سجلت تعثراً جديداً.' },
  { id: 'failure-private-3', message: 'الضمان لم يصل إلى الهدف.' }, { id: 'failure-private-4', message: 'اللعب احتاج ترتيباً أفضل.' },
  { id: 'failure-private-5', message: 'هذه المحاولة لم تُحسب كما خُطط لها.' }
];

export const kabootMessage: Tarneeb61Reaction = {
  id: 'kaboot',
  message: 'سجل كبووووود للملك ✌️🖤',
  variant: 'kaboot',
  durationMs: 5600,
  badge: '13 / 13'
};

export const brokenSevenMessage: Tarneeb61Reaction = {
  id: 'broken-seven',
  message: 'انكسار ضمان 7 حدث كبير؛ الجولة تستحق مراجعة دقيقة قبل الضمان التالي.',
  variant: 'broken-seven',
  durationMs: 11000
};

export function pickRandomMessage(messages: ReactionMessage[], previousId?: string, random: () => number = Math.random) {
  const candidates = messages.length > 1 ? messages.filter((message) => message.id !== previousId) : messages;
  const index = Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length));
  return candidates[index];
}

export function getTarneeb61Reaction(
  context: Tarneeb61ReactionContext,
  previousId?: string,
  random: () => number = Math.random
): Tarneeb61Reaction {
  if (!context.contractSucceeded && context.bid === 7) return brokenSevenMessage;
  if (context.contractSucceeded && context.actualTricks === 13) return kabootMessage;
  const variant = context.contractSucceeded ? 'success' : 'failure';
  const selected = pickRandomMessage(variant === 'success' ? TARNEEB_SUCCESS_MESSAGES : [...TARNEEB_FAILURE_MESSAGES, ...TARNEEB_PRIVATE_FAILURE_MESSAGES], previousId, random);
  return { ...selected, variant, durationMs: 4600 };
}

export function getContextualTarneeb61Reaction(
  context: Tarneeb61ReactionContext & { playerId: string },
  attempts: Tarneeb61Attempt[],
  previousId?: string,
  random: () => number = Math.random
): Tarneeb61Reaction {
  const base = getTarneeb61Reaction(context, previousId, random);
  if (base.variant === 'broken-seven') return base;
  const playerAttempts = attempts.filter((attempt) => attempt.playerId === context.playerId);
  const kaboots = playerAttempts.filter((attempt) => attempt.succeeded && attempt.actualTricks === 13).length;
  if (context.contractSucceeded && context.actualTricks === 13 && kaboots >= 2) return { id: 'second-kaboot', message: 'كبوتان في القعدة نفسها؛ أداء استثنائي 👑', variant: 'kaboot', durationMs: 6200, badge: '13 × 2' };
  if (base.variant === 'kaboot') return base;
  let run = 0;
  for (let index = playerAttempts.length - 1; index >= 0; index -= 1) {
    if (playerAttempts[index].succeeded !== context.contractSucceeded) break;
    run += 1;
  }
  if (context.contractSucceeded && run >= 5) return { id: 'success-streak-5', message: 'خمس ضمانات ناجحة متتالية؛ سلسلة مميزة.', variant: 'success', durationMs: 5600, badge: '5 ناجحة' };
  if (context.contractSucceeded && run >= 3) return { id: 'success-streak-3', message: 'ثلاث ضمانات ناجحة متتالية.', variant: 'success', durationMs: 5200, badge: '3 ناجحة' };
  if (!context.contractSucceeded && run >= 3) return { id: 'failure-streak-3', message: 'ثالث انكسار متتالٍ؛ حان وقت تغيير الخطة.', variant: 'failure', durationMs: 5600, badge: '3 انكسارات' };
  return base;
}
