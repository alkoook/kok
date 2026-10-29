import type { LikhaRoundInput } from './types';

type ReactionPool = { event: string; priority: number; durationMs: number; tone: 'queen' | 'gold' | 'disaster' | 'normal'; messages: string[] };

const pools: ReactionPool[] = [
  { event: 'queen-doubled', priority: 100, durationMs: 7200, tone: 'disaster', messages: [
    'مدبلة كمان؟ 😂 لك انت مو لاعب، انت مكب نفايات ورق.', 'أكل بنت مدبلة... هاد مو لطش، هاد اغتيال مباشر.', '26 نقطة بالخرا دفعة وحدة... إنجاز يستحق الشفقة.',
    'لك بنت مدبلة؟ قوم اغسل وجهك يمكن تستوعب شو عملت.', 'البنت مدبلة دخلت فيك دخول رسمي وما عاد في مجال إنكار.', 'يا خرا عهالاختيار... بنت مدبلة كمان.',
    '26 سالب؟ حتى الحاسبة استحت تكتبلك الرقم.', 'أكل البنت ×2... سجلوا الجريمة باسم الحمار الموجود عالطاولة.', 'البنت العادية ما كفتك، قلت هات المدبلة خليني أخربها صح.',
    'لو في كأس لأسوأ لقطة بالقعدة أخدته من دون منافس.'
  ] },
  { event: 'queen', priority: 90, durationMs: 6200, tone: 'queen', messages: [
    'البنت ركبت براسك يا حمار 😂', 'مبروك البنت... ناقصك وردة وحطها عصدرك.', 'لك مو معقول، كل الطاولة فيها أربع لاعبين والبنت اختارت هالحمار.',
    'بنت البستوني وصلت... افتحلا حضنك يا زفت.', 'أكل البنت وقاعد ساكت كأنو ما صار شي 💀', 'لك شيل هالبنت من تمك قبل ما تختنق فيها.',
    'البنت قالت بدي أغبى واحد عالطاولة... وتم الاختيار.', 'برافو يا وحش، اصطدت أسوأ ورقة بالقعدة 😂', 'من بين 52 ورقة، لازم تمسك بالخرا بإيدك.',
    'يا زلمة حتى البنت ما عاد بدها تتركك بحالك.', 'لك شو هالجاذبية؟ بنت البستوني عم تلزق فيك لصق.', 'أكل البنت... أعلنوا دقيقة صمت على اللي كان مفكرو بيعرف يلعب.'
  ] },
  { event: 'ten-doubled', priority: 80, durationMs: 5200, tone: 'gold', messages: [
    'عشرين موجب؟ ولك مين سمحلك تتحسن فجأة؟', '10 الديناري مدبل... لك اليوم الحمار لابس بدلة ملك 😂', '+20 دفعة وحدة، لا تتحمس كتير لساتك انت انت.',
    'العشرة مدبلة أنقذتك من قبر كنت حافرو بإيدك.', 'يا سلام +20... هلق فيك ترجع تخربهن براحتك.', 'ضربة حظ بعشرين نقطة... صورها قبل ما ترجع لطبيعتك.'
  ] },
  { event: 'ten', priority: 70, durationMs: 4800, tone: 'gold', messages: [
    'أخيراً أكل شي بينفع... +10 يا محظوظ 😂', 'العشرة وقعت بتمك بالغلط، لا تعمل حالك مخططلا.', '10 الديناري أنقذتك شوي من الزبالة اللي عم تعملها.',
    'طلع معك شي موجب! وقفوا اللعب وصوروا اللحظة.', 'يا لطيف... نقطة إيجابية عندك؟ سجلوا التاريخ.', 'أكل العشرة وصار مفكر حالو بطل القعدة.',
    'العشرة إجت لعندك مش لأنك شاطر... لأنها ضاعت بالطريق.', 'مبروك +10، صار عندك مجال تعمل مصيبة جديدة.'
  ] },
  { event: 'king-doubled', priority: 60, durationMs: 6000, tone: 'disaster', messages: [
    '28 سالب من الختيار؟ يا ساتر من هالغباء.', 'ختيار مدبل... دفنت حالك وأنت واقف.', 'الختيار ×2 دخل عليك متل فاتورة كهربا آخر الشهر.', '28 نقطة سالب؟ هاد مو Score، هاد محضر ضبط.', 'الختيار المدبل قعد بحضنك ورفض يقوم.'
  ] },
  { event: 'jack-doubled', priority: 50, durationMs: 5600, tone: 'disaster', messages: [
    '22 سالب بالشب... شغل مرتب يا خرا 😂', 'الشب ×2؟ لك ما بتتعلم إلا بالعنف الرقمي.', '22 نقطة طارت لأنك قررت تكون مبدع بالهبل.', 'الشب المدبل مرق عليك وترك حفرة بالنتيجة.'
  ] },
  { event: 'hearts', priority: 40, durationMs: 5000, tone: 'normal', messages: [
    'لك عم تجمع كوبا ولا عم تعمل طقم سفرة؟', 'شايل نص الكوبا وعم تسأل ليش نتيجتك خرا.', 'خلي كوبايتين لغيرك يا بلّاعة.',
    'أكل الكوبا كأنها بزر... وحدة ورا وحدة.', 'إذا الكوبا بتنشرى كنت فلست القعدة.', 'بلعت الكوبا بلع... ناقصك تشرب مي فوقها.'
  ] },
  { event: 'disaster', priority: 30, durationMs: 6200, tone: 'disaster', messages: [
    'هاد مو تسجيل نقاط، هاد انهيار اقتصادي.', 'كل هالسالب بجولة وحدة؟ لك روّق شوي على حالك.', 'الجولة خلصت وانت لحالك محتاج إعادة إعمار.',
    'هالرقم مو Score... هاد اعتراف رسمي إنك خربتها.', 'لو الخرا بينحسب نقاط كنت الأول عالمياً.', 'يا معلم الجولة كلها طلعت من طيزك عالدفتر.',
    'حتى اللي ربح ما فرح قد ما ضحك عليك.'
  ] },
  { event: 'excellent', priority: 20, durationMs: 4400, tone: 'gold', messages: [
    'طلع بيعرف يلعب هالمرة 😎', 'نظيفة... ما عندي شي أسبك عليه هالمرة.', 'الجولة هاي انلعبت صح، لا تتعود.',
    'يا لطيف... لعب آدمي! وثقوا اللحظة.', 'هالمرة طلعت من الجولة بلا فضيحة.'
  ] },
  { event: 'general', priority: 10, durationMs: 4400, tone: 'normal', messages: [
    'الجولة انكتبت... والمحكمة عم تراجع الأدلة.', 'كل ورقة إلها حساب، وكل مصيبة إلها صاحب.', 'القعدة بعدها طويلة، لا حدا يعلن البطولة.', 'الدفتر ساكت بس حافظ كل شي.'
  ] }
];

const partnershipMessages = [
  (partnerName: string) => `و${partnerName} شريكك عم يراجع كل قراراته اللي وصلته لعندك.`,
  (partnerName: string) => `الشراكة تضامن بالمصايب، و${partnerName} شريكك أكل النتيجة معك.`,
  (partnerName: string) => `${partnerName} ما أكل الورقة، بس أكل النتيجة معك.`,
  (partnerName: string) => `الفريق فريقين: ${partnerName} عم يلعب وإنت عم تحفر.`,
  (partnerName: string) => `وصلت الضربة لـ${partnerName} وهو ما قرب عالورقة.`
];

export const LIKHA_REACTION_COUNT = pools.reduce((sum, pool) => sum + pool.messages.length, 0) + partnershipMessages.length;

export type LikhaReaction = { id: string; event: string; playerId: string; message: string; durationMs: number; tone: ReactionPool['tone'] };

export function selectLikhaReaction(input: LikhaRoundInput, delta: Record<string, number>, previousId?: string, partnerName?: string): LikhaReaction {
  const queen = input.specialCards.queenSpades; const ten = input.specialCards.tenDiamonds; const king = input.specialCards.kingClubs; const jack = input.specialCards.jackDiamonds;
  const candidates = [
    { event: queen.doubled ? 'queen-doubled' : 'queen', playerId: queen.capturedBy },
    { event: ten.doubled ? 'ten-doubled' : 'ten', playerId: ten.capturedBy },
    ...(king.doubled ? [{ event: 'king-doubled', playerId: king.capturedBy }] : []),
    ...(jack.doubled ? [{ event: 'jack-doubled', playerId: jack.capturedBy }] : []),
    ...input.players.filter((entry) => entry.heartsCount >= 6).map((entry) => ({ event: 'hearts', playerId: entry.playerId })),
    ...Object.entries(delta).filter(([, score]) => score <= -30).map(([playerId]) => ({ event: 'disaster', playerId })),
    ...Object.entries(delta).filter(([, score]) => score >= 0).map(([playerId]) => ({ event: 'excellent', playerId }))
  ];
  const selected = candidates.map((candidate) => ({ ...candidate, pool: pools.find((pool) => pool.event === candidate.event)! })).sort((a, b) => b.pool.priority - a.pool.priority)[0]
    ?? { event: 'general', playerId: input.players[0].playerId, pool: pools.find((pool) => pool.event === 'general')! };
  const options = selected.pool.messages.map((message, index) => ({ id: `${selected.event}-${index}`, message })).filter((item) => item.id !== previousId);
  const choice = options[Math.floor(Math.random() * options.length)] ?? { id: `${selected.event}-0`, message: selected.pool.messages[0] };
  const partnerMessage = partnershipMessages[Math.floor(Math.random() * partnershipMessages.length)];
  const partnerSuffix = partnerName && partnerMessage ? ` ${partnerMessage(partnerName)}` : '';
  return { ...choice, message: `${choice.message}${partnerSuffix}`, event: selected.event, playerId: selected.playerId, durationMs: selected.pool.durationMs, tone: selected.pool.tone };
}
