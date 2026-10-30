import type { LikhaRoundInput } from './types';

type ReactionPool = { event: string; priority: number; durationMs: number; tone: 'queen' | 'gold' | 'disaster' | 'normal'; messages: string[] };

const pools: ReactionPool[] = [
  { event: 'queen-doubled', priority: 100, durationMs: 7200, tone: 'disaster', messages: [
    'بنت مدبلة كمان؟ الجولة أخذت منعطفاً ثقيلاً.', 'أكل بنت مدبلة... ضربة مباشرة على النتيجة.', '26 نقطة سالبة دفعة واحدة؛ الرقم يتكلم وحده.',
    'البنت المدبلة وصلت، والحاسبة رفعت حالة التأهب.', 'هذه ليست ورقة عادية؛ هذه جولة تغيّر الترتيب.', 'البنت ×2 سُجلت، والعودة تحتاج جولة كبيرة.',
    '26 سالب؟ حتى لوحة النتائج توقفت لحظة.', 'أكل البنت ×2... لقطة الجولة بلا منافس.', 'البنت العادية لم تكفِ؛ المدبلة حضرت أيضاً.',
    'لو في جائزة لأثقل ورقة في الجولة، حُسمت الآن.'
  ] },
  { event: 'queen', priority: 90, durationMs: 6200, tone: 'queen', messages: [
    'بنت البستوني وصلت وسجلت حضورها فوراً.', 'البنت صارت عندك... ناقصها وردة على الطاولة.', 'أربع لاعبين، والبنت اختارت هذا المكان تحديداً.',
    'بنت البستوني وصلت؛ النتيجة ستشعر بها.', 'أكل البنت وكأن شيئاً لم يحدث... لكن الدفتر تذكّر.', 'هذه الورقة تحتاج خطة تعويض سريعة.',
    'البنت اختارت صاحبها، وتم تسجيل القرار.', 'اصطدت أثقل ورقة في القعدة.', 'من بين 52 ورقة، هذه تحديداً وجدت طريقها إليك.',
    'واضح أن بنت البستوني لا تريد الابتعاد.', 'يا لها من جاذبية؛ البنت تكرّر الزيارة.', 'أكل البنت... دقيقة صمت على رصيد الجولة.'
  ] },
  { event: 'ten-doubled', priority: 80, durationMs: 5200, tone: 'gold', messages: [
    'عشرون موجباً؟ تحسن مفاجئ ومهم.', '10 الديناري مدبل... ضربة ذهبية.', '+20 دفعة واحدة؛ هذه لقطة تستحق الحفظ.',
    'العشرة المدبلة أنقذت جزءاً كبيراً من الجولة.', 'يا سلام +20... ميزان الجولة تغيّر.', 'عشرون نقطة موجبة؛ صورة سريعة قبل الجولة التالية.'
  ] },
  { event: 'ten', priority: 70, durationMs: 4800, tone: 'gold', messages: [
    'أخيراً ورقة موجبة... +10 في مكانها.', 'العشرة وصلت، والخطة تبدو أفضل الآن.', '10 الديناري خففت ضغط الجولة.',
    'ظهر رقم موجب؛ سجلوا اللحظة.', 'نقطة إيجابية مهمة في هذا التوقيت.', 'أكل العشرة وصار في مجال للتقدم.',
    'العشرة وجدت طريقها الصحيح هذه المرة.', 'مبروك +10؛ الجولة تنفست قليلاً.'
  ] },
  { event: 'king-doubled', priority: 60, durationMs: 6000, tone: 'disaster', messages: [
    '28 سالباً من الختيار؛ ضربة ثقيلة.', 'ختيار مدبل... النتيجة دخلت منطقة الخطر.', 'الختيار ×2 وصل مثل فاتورة كبيرة آخر الشهر.', '28 نقطة سالبة؛ هذا محضر جولة كامل.', 'الختيار المدبل جلس في الرصيد ورفض المغادرة.'
  ] },
  { event: 'jack-doubled', priority: 50, durationMs: 5600, tone: 'disaster', messages: [
    '22 سالباً بالشب؛ الجولة أصبحت أصعب.', 'الشب ×2؟ الأثر واضح على النتيجة.', '22 نقطة ذهبت في لقطة واحدة.', 'الشب المدبل مرّ وترك فجوة في الرصيد.'
  ] },
  { event: 'hearts', priority: 40, durationMs: 5000, tone: 'normal', messages: [
    'هل تجمع كوبا أم تكمل طقم السفرة؟', 'نصف الكوبا صار عند لاعب واحد.', 'اترك كوبايتين لبقية الطاولة.',
    'الكوبا جاءت واحدة وراء الأخرى.', 'لو كانت الكوبا تُشترى لارتفعت الفاتورة.', 'مجموعة كوبا كبيرة في جولة واحدة.'
  ] },
  { event: 'disaster', priority: 30, durationMs: 6200, tone: 'disaster', messages: [
    'هذا ليس تسجيل نقاط؛ هذا انهيار كامل للجولة.', 'كل هذا السالب في جولة واحدة؟ تحتاج الجولة التالية لخطة واضحة.', 'الجولة انتهت والنتيجة تحتاج إعادة بناء.',
    'هذا الرقم اعتراف رسمي بأن الجولة تعقدت.', 'الرقم كبير لدرجة أن الدفتر طلب مراجعة.', 'كل أحداث الجولة اجتمعت في خانة واحدة.',
    'حتى الفائز توقف ليتأكد من الرقم.'
  ] },
  { event: 'excellent', priority: 20, durationMs: 4400, tone: 'gold', messages: [
    'جولة ممتازة هذه المرة.', 'نظيفة... لا ملاحظات على الأداء.', 'الجولة انلعبت صح.',
    'لعب مرتب؛ وثقوا اللحظة.', 'خرجت من الجولة بلا خسائر ثقيلة.'
  ] },
  { event: 'general', priority: 10, durationMs: 4400, tone: 'normal', messages: [
    'الجولة انكتبت، والدفتر يراجع التفاصيل.', 'كل ورقة لها حساب وكل نقطة لها صاحب.', 'القعدة بعدها طويلة؛ لا أحد يعلن البطولة.', 'الدفتر ساكت لكنه حافظ كل شيء.'
  ] }
];

const partnershipMessages = [
  (partnerName: string) => `و${partnerName} شريكك يراجع أثر الجولة على الفريق.`,
  (partnerName: string) => `الشراكة نتيجة مشتركة، و${partnerName} تحمّل أثر الورقة معك.`,
  (partnerName: string) => `${partnerName} لم يأكل الورقة، لكنه شاركك نتيجتها.`,
  (partnerName: string) => `الفريق واحد، و${partnerName} ينتظر جولة التعويض.`,
  (partnerName: string) => `وصل أثر الضربة إلى ${partnerName} رغم أنه لم يقترب من الورقة.`
];

export const LIKHA_REACTION_COUNT = pools.reduce((sum, pool) => sum + pool.messages.length, 0) + partnershipMessages.length;

export type LikhaReaction = { id: string; event: string; playerId: string; message: string; durationMs: number; tone: ReactionPool['tone'] };

export function selectLikhaReaction(input: LikhaRoundInput, delta: Record<string, number>, previousId?: string, partnerName?: string): LikhaReaction {
  const queen = input.specialCards.queenSpades; const ten = input.specialCards.tenDiamonds; const king = input.specialCards.kingClubs; const jack = input.specialCards.jackDiamonds;
  const owner = (card: keyof LikhaRoundInput['specialCards']) => input.specialCards[card].capturedBy || input.partnership?.cardTeams[card] || '';
  const candidates = [
    { event: queen.doubled ? 'queen-doubled' : 'queen', playerId: owner('queenSpades') },
    { event: ten.doubled ? 'ten-doubled' : 'ten', playerId: owner('tenDiamonds') },
    ...(king.doubled ? [{ event: 'king-doubled', playerId: owner('kingClubs') }] : []),
    ...(jack.doubled ? [{ event: 'jack-doubled', playerId: owner('jackDiamonds') }] : []),
    ...input.players.filter((entry) => entry.heartsCount >= 6).map((entry) => ({ event: 'hearts', playerId: entry.playerId })),
    ...Object.entries(delta).filter(([, score]) => score <= -30).map(([playerId]) => ({ event: 'disaster', playerId })),
    ...Object.entries(delta).filter(([, score]) => score >= 0).map(([playerId]) => ({ event: 'excellent', playerId }))
  ];
  const selected = candidates.map((candidate) => ({ ...candidate, pool: pools.find((pool) => pool.event === candidate.event)! })).sort((a, b) => b.pool.priority - a.pool.priority)[0]
    ?? { event: 'general', playerId: input.partnership?.enteredTeamId ?? input.players[0].playerId, pool: pools.find((pool) => pool.event === 'general')! };
  const options = selected.pool.messages.map((message, index) => ({ id: `${selected.event}-${index}`, message })).filter((item) => item.id !== previousId);
  const choice = options[Math.floor(Math.random() * options.length)] ?? { id: `${selected.event}-0`, message: selected.pool.messages[0] };
  const partnerMessage = partnershipMessages[Math.floor(Math.random() * partnershipMessages.length)];
  const partnerSuffix = partnerName && partnerMessage ? ` ${partnerMessage(partnerName)}` : '';
  return { ...choice, message: `${choice.message}${partnerSuffix}`, event: selected.event, playerId: selected.playerId, durationMs: selected.pool.durationMs, tone: selected.pool.tone };
}
