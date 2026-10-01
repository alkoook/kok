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
  { id: 'success-1', message: 'عاااااش يا وحش' },
  { id: 'success-2', message: 'ضمن وجاب السبع' },
  { id: 'success-3', message: 'وحش ولككك' },
  { id: 'success-4', message: 'ملك الـ61' },
  { id: 'success-5', message: 'شيلك من الضمان ..شفت الفن باللعب ؟!' },
  { id: 'success-6', message: 'الكينغ ضمن الكينغ جاب' },
  { id: 'success-7', message: 'رسالة لكل الخنافس ..هل من منافس😎' },
  { id: 'success-8', message: 'ما بدي اسمع نفس ولككك' },
  { id: 'success-9', message: 'ضمنت وجبت ..مافي شي جديد' },
  { id: 'success-10', message: 'تم الدعس🐾' }
];

export const TARNEEB_FAILURE_MESSAGES: ReactionMessage[] = [
  { id: 'failure-1', message: 'انكسر بخشي 🤣' },
  { id: 'failure-2', message: 'مين الحمار اللي ضمن ؟!' },
  { id: 'failure-3', message: 'طيب ما بتعرف تلعب شدة ...ليش لتصرع طيزنا وتقول لعبوني ؟!' },
  { id: 'failure-4', message: 'قوم وحط محلك صحن سيجارة' },
  { id: 'failure-5', message: 'ولو انتة امتحان من رب العالمين لشريكك' },
  { id: 'failure-6', message: 'بهجت صابر بدو ياك بكلمتين' },
  { id: 'failure-7', message: 'خراي عاللي مسكك شدة' },
  { id: 'failure-8', message: 'معلم كأنو الـ61 مو لعبتك ؟؟!' },
  { id: 'failure-9', message: 'لا عاد تضمن مشان الله' },
  { id: 'failure-10', message: 'مين اتصل بهالحمار وجابوا عالسهرة ؟!' },
  { id: 'failure-11', message: 'حجي أهلك اتصلوا قال بدن ياك عالسريع' },
  { id: 'failure-12', message: 'لك بدك تضلك حمار ولوووو' },
  { id: 'failure-13', message: 'عطوه لشريكو حبة تحت اللسان' },
  { id: 'failure-14', message: 'شقني وجيبا تلحس طيزي' },
  { id: 'failure-15', message: 'يلا حبيبي يلا بطلنا نلعب شدة' },
  { id: 'failure-16', message: 'شو أبو منير اللي ضمن ؟!' }
];

export const TARNEEB_PRIVATE_FAILURE_MESSAGES: ReactionMessage[] = [
  { id: 'failure-private-1', message: 'انكسر الاير' },
  { id: 'failure-private-2', message: 'كس اخت هالقعدة ولو' },
  { id: 'failure-private-3', message: 'انكسر الحمار ريتو يلحس طيز أبو منير' },
  { id: 'failure-private-4', message: 'أبو ربيع ما اشتغل هالشغل الايري' },
  { id: 'failure-private-5', message: 'أبو أسامة اللي قلك تلعب هاللعب ؟؟!' }
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
  message: 'ولو علي الحرام حمار ومعبى ببنطرون ...ضمنت 7 وانكسرت ولساتك قاعد ...قووووم خرايي عليك وعاللي مسكك ورق شدة شو حمار ... 7 وتنكسر يا الله ...قوم تسطح وابصق بالهوا خليها تنزل عليك حرام تكون بني ادم يا زلمة ... حدا يقول لصاحب القعدة يقلع هالحمار',
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
  if (context.contractSucceeded && context.actualTricks === 13 && kaboots >= 2) return { id: 'second-kaboot', message: 'كبوتين بنفس القعدة؟! سكّروا اللعب وروحوا ناموا... الملك حضر 👑🖤', variant: 'kaboot', durationMs: 6200, badge: '13 × 2' };
  if (base.variant === 'kaboot') return base;
  let run = 0;
  for (let index = playerAttempts.length - 1; index >= 0; index -= 1) {
    if (playerAttempts[index].succeeded !== context.contractSucceeded) break;
    run += 1;
  }
  if (context.contractSucceeded && run >= 5) return { id: 'success-streak-5', message: 'خمس ضمانات ناجحة ورا بعض... خلص سلموه القعدة وروحوا 😂', variant: 'success', durationMs: 5600, badge: '5 ناجحة' };
  if (context.contractSucceeded && run >= 3) return { id: 'success-streak-3', message: 'ثلاث ضمانات ورا بعض... شكلو الليلة ناوي يربيكن 😎', variant: 'success', durationMs: 5200, badge: '3 ناجحة' };
  if (!context.contractSucceeded && run >= 3) return { id: 'failure-streak-3', message: 'ثالث انكسار ورا بعض... شريكك بلش يدور على شريك جديد 🤣', variant: 'failure', durationMs: 5600, badge: '3 انكسارات' };
  return base;
}
