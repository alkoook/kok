import type { GamePlayer, GameSession, MessageRule } from '../../types';
import { TARNEEB_FAILURE_MESSAGES, TARNEEB_PRIVATE_FAILURE_MESSAGES, TARNEEB_SUCCESS_MESSAGES, brokenSevenMessage, kabootMessage } from '../tarneeb/reactions';
import { partnerForPlayer, teamForPlayer } from './scoring';

export type TemplateValues = Partial<Record<'owner' | 'player' | 'partner' | 'score' | 'absScore' | 'team' | 'opponent' | 'opponentTeam' | 'margin' | 'kingdom' | 'target' | 'winner' | 'loser' | 'count' | 'fourthCount' | 'oldManCount' | 'doubledCount' | 'leadChanges' | 'kingdomWins' | 'ownerBehindPartner' | 'largestSwing' | 'averagePlacement' | 'bestLash', string | number>>;
export type MessageContext = { game: GameSession; owner: GamePlayer; ownerScore?: number; partnerScore?: number; eaterPlayerId?: string; doubled?: boolean; occurrences?: number; target?: number; intensity?: 1 | 2 | 3 | 4 };

const now = '2026-10-01T00:00:00.000Z';
type LashBand = { id: string; minScore?: number; maxScore?: number; partnership: string; solo: string };
export const LASH_BANDS: LashBand[] = [
  { id: 'positive', minScore: 1, partnership: 'الملك {owner} ..حجي قوم مد الغالي بالقعدة خلي الشباب تاخد الرضا', solo: 'الملك {owner} ..حجي قوم مد الغالي بالقعدة خلي الشباب تاخد الرضا' },
  { id: '0-to-50', minScore: -50, maxScore: 0, partnership: 'عاااااش يا وحش الـ{absScore} ولا شي', solo: 'عاااااش يا وحش الـ{absScore} ولا شي' },
  { id: '51-to-100', minScore: -100, maxScore: -51, partnership: 'حلوة ودليل على فهم {owner}', solo: 'حلوة ودليل على فهم {owner}' },
  { id: '101-to-200', minScore: -200, maxScore: -101, partnership: 'لا بأس حجي لا بأس مقبولة نوعاً ما', solo: 'خراي على هالمخ شو حمار' },
  { id: '201-to-249', minScore: -249, maxScore: -201, partnership: 'شو الترتيب يابا شو هالنتيجة الخرا', solo: 'شو الترتيب يابا شو هالنتيجة الخرا' },
  { id: 'exact-250', minScore: -250, maxScore: -250, partnership: 'يلا انقسمت بيناتنا', solo: 'اكلت نص الشدة قوم انقلع ع بيتكن' },
  { id: '251-to-300', minScore: -300, maxScore: -251, partnership: 'شو هاد حمار سبحان مين حجبك عن أكل التبن', solo: 'شو هاد حمار سبحان مين حجبك عن أكل التبن' },
  { id: '301-to-350', minScore: -350, maxScore: -301, partnership: 'خراي عليك وعالشدة وعاللي مسكك ورق شدة وقلك بتفهم تلعب', solo: 'خراي عليك وعالشدة وعاللي مسكك ورق شدة وقلك بتفهم تلعب' },
  { id: '351-to-400', minScore: -400, maxScore: -351, partnership: 'قوم ع بيتكن ايري فيك وباللي اتصل فيك وعزمك عالقعدة يلا حجي يلا ع بيتكن', solo: 'قوم ع بيتكن ايري فيك وباللي اتصل فيك وعزمك عالقعدة يلا حجي يلا ع بيتكن' },
  { id: '401-to-450', minScore: -450, maxScore: -401, partnership: 'شوووووو هاللعب المأير هاد ع شوي رح توصل لمستوى منذر طبانة بالبهم', solo: 'شوووووو هاللعب المأير هاد ع شوي رح توصل لمستوى منذر طبانة بالبهم' },
  { id: '451-to-499', minScore: -499, maxScore: -451, partnership: 'اووووووووووووه لعب كلاب هاد مو لعب بني آدمين ...شو يا {owner} مو حاسس حالك حمار ...تريك ورق هالشدة وقوم شوف مستقبلك بغير مكان', solo: 'اووووووووووووه لعب كلاب هاد مو لعب بني آدمين ...شو يا {owner} مو حاسس حالك حمار ...تريك ورق هالشدة وقوم شوف مستقبلك بغير مكان' },
  { id: '500-or-less', maxScore: -500, partnership: 'يا جماعة واضحة ......خلونا نقوم نعمل فرشاية لـ {owner} .....طيزو محجوزة لأبو عمر شفلك مكان تاني وغزو منو', solo: 'يا جماعة واضحة ......خلونا نقوم نعمل فرشاية لـ {owner} .....طيزو محجوزة لأبو عمر شفلك مكان تاني وغزو منو' }
];

const trixDefaults: Array<[number, number, string]> = [
  [200, 150, 'جوني سنس وشريكو'], [200, 100, 'لعب معلمين هاد'], [200, 50, 'يلا شي بعوض شي'],
  [150, 200, 'جوني سنس وشريكو'], [150, 100, 'يلا مقبولة'], [150, 50, 'كس اخت هالتسماية'],
  [100, 200, 'ولله يا {owner} شريكك أفهم منك'], [100, 150, 'يلا مقبولة'], [100, 50, 'ورق خرا وشراكة ع أخرا'],
  [50, 200, 'معلم {partner} الله يعينك على هالحمار'], [50, 150, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة'], [50, 100, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة']
];

const oldManPools: Array<{ group: string; event: MessageRule['event']; doubled?: boolean; duration: number; required: string; alternatives: string[] }> = [
  { group: 'owner-normal', event: 'old-man-owner', doubled: false, duration: 5000, required: 'ملط الختيار ملط يلحس ايري', alternatives: ['صاحب المملكة أكل الختيار ببيته؛ يا للضيافة.', 'إعلان داخلي: الملك أكل الضيف بدل ما يكرمه.', 'الختيار حفظ عنوان {owner} وصار يجيه بلا موعد.', 'مملكة {owner} فتحت مطعم اختصاصه اختيار.', 'يا ملك، الختيار مو ضيافة إجبارية بكل مملكة.', 'القصر الملكي صار دار رعاية للختيار.', 'الختيار دخل مملكة {owner} ورفض يطلع.', 'تقرير المملكة: صاحبها أكل الختيار ووقّع الاستلام.', 'حتى التاج خجل من منظر الختيار عند {owner}.', 'مبروك، صار الختيار فرد رسمي من عيلة {owner}.', 'الملك وقع بفخ الختيار قدام شعبه كله.', 'مراسم التتويج تأجلت بسبب وجود اختيار بالحلق.', 'القصر طلب سبّاك؛ الختيار مسكّر كل المجاري.', 'صاحب المملكة استقبل الختيار استقبال الأبطال وأكله.', 'الختيار قال ما إلي غير بيت {owner}.', 'خبر ملكي: الضيافة اليوم إجبارية ومدفوعة بالنقاط.', 'يا {partner} لمّ الملك، الختيار دوّخه.', 'الختيار أخذ سيلفي مع صاحب المملكة قبل الكارثة.', 'المملكة كلها شمت ريحة الختيار.', 'حرس القصر فشل يمنع الختيار من الوصول للملك.'] },
  { group: 'owner-doubled', event: 'old-man-owner', doubled: true, duration: 10000, required: 'ولد راح لعند أبوه وقلو ...بابا ناكوني بالحارة ....قلو الأب أسهل ما تاكل الختيار مدبل بمملكتك متل هالحمار {owner}', alternatives: ['طوارئ ملكية: {owner} أكل الختيار مدبل بمملكته، سكّروا الحدود.', 'الختيار المدبل استلم مفاتيح القصر وصاحب المملكة صار ضيف.', 'يا {partner} شريكك جمع الملك والختيار والتدبيل بمصيبة وحدة.', 'خبر عاجل: المملكة أعلنت الحداد بعد اختيار مدبل بصاحبها.', 'مبروك {owner}، صرت العنوان الرسمي للختيار المدبل.', 'حتى الختيار استغرب كيف أكلته مدبل وبمملكتك.', 'القصر الملكي تحوّل لمشفى بعد هالختيار المدبل.', 'التاج وقع، والختيار ضحك، والنقاط طارت.', 'تقرير سري: صاحب المملكة ساعد الختيار المدبل يدخل من الباب الرئيسي.', 'هاي مو ضيافة يا {owner}، هاي تسليم مملكة كامل.', 'الختيار المدبل عم يسأل إذا في مملكة ثانية عند {owner}.', 'المؤرخ كتب: هنا سقط الملك على يد اختيار مدبل.', 'المملكة بدها إعادة إعمار بعد هالحادثة.', 'حرس القصر قدّم استقالته بعد ما شاف الختيار مدبل.', 'يا جماعة خففوا صوت، الملك عم يهضم الختيار المدبل.', 'الختيار ربح إقامة دائمة بمملكة {owner}.', 'اجتماع طارئ لحل أزمة الاختيار المدبل الملكية.', 'ما ضل غير التاج يتدبل كمان وتكمل المسرحية.', 'صاحب المملكة طلب حذف الجولة من التاريخ الرسمي.', 'الختيار المدبل صار ولي عهد المملكة بالغصب.'] },
  { group: 'partner', event: 'old-man-partner', duration: 5000, required: 'يا {owner} شريكك {player} أكل الختيار، لحقه قبل ما يبلع الشراكة.', alternatives: ['{partner} أكل الختيار والشراكة طلبت إسعاف.', 'الختيار اختار شريك الملك تحديدًا، يا للمصادفة الوسخة.', 'يا {owner} انتبه، {player} عم يخرّب المملكة من الجناح الثاني.', 'الشريك أكل الختيار والملك عم يدفع الفاتورة.', 'اجتماع الفريق تأجل لأن {player} مشغول بالختيار.', 'الختيار دخل من باب الشريك ووصل للقصر.', 'الشراكة اليوم نكهتها اختيار مع ندم.', 'يا {team} لمّوا بعض، الختيار بلش يفرّق بيناتكن.', 'الشريك صار موزع معتمد للختيار.', 'الملك نجا، بس شريكه أخد الضربة كاملة.', 'الختيار علّق عند {player} والشراكة كلها سمعت الصوت.', 'يا {owner} حضّر كلمة دعم لشريكك المنكوب.', 'الفريق أعلن تضامنه مع آكل الختيار.', 'الشريك أكلها والخصم صفّق من بعيد.', 'الختيار صار ثالث شريك غصبًا عن الفريق.', 'تقرير الفريق: الخسارة جماعية والأكل فردي.', 'الشريك طلب استراحة هضم بعد الختيار.', 'المملكة بخير نسبيًا، الشريك مو بخير أبدًا.', 'الختيار كشف أضعف حلقة بالشراكة.', 'يا {partner} هنيئًا مريئًا، بس مو على حساب الفريق.'] },
  { group: 'opponent', event: 'old-man-opponent', duration: 5000, required: '{player} من الخصم أكل الختيار؛ المملكة صفّقت من بعيد.', alternatives: ['الختيار راح لعند الخصم، اليوم الحظ عارف عنوانه.', 'الخصم أكل الختيار وصاحب المملكة قال الحمد لله.', 'خبر حلو لـ{team}: المصيبة نزلت بالجهة الثانية.', 'يا {opponentTeam} صحة وهنا عالختيار.', 'المملكة نجت والخصم استلم الشحنة.', 'الختيار عبر الحدود وبلش شغل عند المنافس.', 'الخصم أكلها والملك عمل حاله ما شاف.', 'هالمرة الختيار اختار الضفة الثانية من الطاولة.', 'يا {player} دير بالك، الختيار بلش يحفظ اسمك.', 'الفريق المنافس صار مسؤول رسمي عن الختيار.', 'الملك أرسل برقية شكر للختيار لأنه غيّر وجهته.', 'المصيبة وصلت للخصم بموعدها.', 'الختيار قرر يلعب لصالح المملكة من دون عقد.', 'المنافس أكل الختيار والنتيجة أخذت نفس.', 'اليوم الخطر خارجي، والقصر مرتاح.', 'الخصوم فتحوا بوفيه والختيار كان الطبق الرئيسي.', 'مبروك للملكة؛ الختيار ضاع بالطريق ووصل لغيرها.', 'الاختيار نفّذ هجمة مرتدة على الخصم.', 'يا {opponentTeam} تحملوا، الدور وصل لعندكن.', 'صاحب المملكة نجا بأعجوبة والخصم بلعها.'] }
];

function repeatPool(required: string, alternatives: string[], count: number): string[] {
  const result = [required, ...alternatives];
  let index = 0;
  while (result.length < count) {
    const base = alternatives[index % alternatives.length];
    const frames = ['وبحسب شهود الطاولة: ', 'وفي نشرة آخر الجولة: ', 'المحضر الرسمي يقول: ', 'ومن قلب المملكة: '];
    result.push(`${frames[Math.floor(index / alternatives.length) % frames.length]}${base}`);
    index += 1;
  }
  return result.slice(0, count);
}

function createLashRules(): MessageRule[] {
  return (['fast-lash', 'cc-lash'] as const).flatMap((category) => (['partnership', 'solo'] as const).flatMap((trixMode) => LASH_BANDS.map((band): MessageRule => ({
    id: `${category}-${trixMode}-${band.id}`, factoryId: `${category}-${trixMode}-${band.id}`, alternativeGroupId: `${category}-${trixMode}-${band.id}`,
    category, gameTypes: category === 'fast-lash' ? ['trix-fast'] : ['cc'], event: 'lash-owner-score', trixMode, minScore: band.minScore, maxScore: band.maxScore,
    template: band[trixMode], durationMs: 5000, enabled: true, priority: 20, intensity: 1, createdAt: now, updatedAt: now
  }))));
}

function createTrixRules(): MessageRule[] {
  return trixDefaults.map(([ownerScore, partnerScore, template]): MessageRule => ({
    id: `fast-trix-${ownerScore}-${partnerScore}`, factoryId: `fast-trix-${ownerScore}-${partnerScore}`, alternativeGroupId: `fast-trix-${ownerScore}-${partnerScore}`,
    category: 'fast-trix', gameTypes: ['trix-fast'], event: 'trix-partnership', trixMode: 'partnership', ownerScore, partnerScore, template, durationMs: 5000, enabled: true, priority: 30,
    intensity: 1, createdAt: now, updatedAt: now
  }));
}

function createOldManRules(): MessageRule[] {
  const standard = oldManPools.flatMap((pool) => repeatPool(pool.required, pool.alternatives, pool.group === 'owner-doubled' ? 24 : 20).map((template, index): MessageRule => ({
    id: `old-man-${pool.group}-${index + 1}`, factoryId: `old-man-${pool.group}-${index + 1}`, alternativeGroupId: `old-man-${pool.group}`,
    category: 'old-man', gameTypes: ['trix-fast', 'cc'], event: pool.event, doubled: pool.doubled, template, durationMs: pool.duration, enabled: true, priority: pool.doubled ? 100 : 80,
    intensity: Math.min(4, (index % 4) + 1) as 1 | 2 | 3 | 4, createdAt: now, updatedAt: now
  })));
  const repeated = (['old-man-owner', 'old-man-partner', 'old-man-opponent'] as const).flatMap((event) => ['{player} أكل الختيار للمرة {count}؛ واضح صار في اشتراك شهري.', 'الختيار رجع لعند {player} للمرة {count} وما عاد الموضوع صدفة.', 'بلاغ تكرار: {player} والختيار صاروا أصحاب بيت.', 'المرة {count} يا {player}؛ الختيار حافظ طريقك أكثر من أهلك.', 'سجل القعدة يقول إن {player} عم يجمع ختيارية.', 'الختيار شاف {player} وقال رجعنا للمطعم المضمون.', 'تكرار الحادثة رفعها من غلطة إلى اختصاص رسمي.', 'يا جماعة حدا يغيّر عنوان {player} قبل ما يرجع الختيار.'].map((template, index): MessageRule => ({ id: `old-man-repeated-${event}-${index + 1}`, factoryId: `old-man-repeated-${event}-${index + 1}`, alternativeGroupId: `old-man-repeated-${event}`, category: 'old-man', gameTypes: ['trix-fast', 'cc'], event, minOccurrences: 2, template, durationMs: 5000, enabled: true, priority: 90, intensity: Math.min(4, index % 4 + 1) as 1 | 2 | 3 | 4, createdAt: now, updatedAt: now })));
  const repeatedDoubled = ['{player} أكل الختيار المدبل للمرة {count}؛ هاي مو عادة هاي مهنة.', 'الختيار المدبل حافظ عنوان {player} وصار يجيه بالتقسيط.', 'المصيبة المدبلة تكررت، افتحوا ملف دائم باسم {player}.', 'للمرة {count}: تدبيل واختيار ونفس الضحية، يا للثبات.'].flatMap((template, index) => (['old-man-owner', 'old-man-partner', 'old-man-opponent'] as const).map((event): MessageRule => ({ id: `old-man-repeated-doubled-${event}-${index + 1}`, factoryId: `old-man-repeated-doubled-${event}-${index + 1}`, alternativeGroupId: `old-man-repeated-doubled-${event}`, category: 'old-man', gameTypes: ['trix-fast', 'cc'], event, doubled: true, minOccurrences: 2, template, durationMs: event === 'old-man-owner' ? 10000 : 5000, enabled: true, priority: 110, intensity: 4, createdAt: now, updatedAt: now })));
  return [...standard, ...repeated, ...repeatedDoubled];
}

const specialTarneeb = [
  { ...kabootMessage, eventId: 'kaboot' }, { ...brokenSevenMessage, eventId: 'broken-seven' },
  { id: 'second-kaboot', eventId: 'second-kaboot', message: 'كبوتين بنفس القعدة؟! سكّروا اللعب وروحوا ناموا... الملك حضر 👑🖤', durationMs: 6200 },
  { id: 'success-streak-3', eventId: 'success-streak-3', message: 'ثلاث ضمانات ورا بعض... شكلو الليلة ناوي يربيكن 😎', durationMs: 5200 },
  { id: 'success-streak-5', eventId: 'success-streak-5', message: 'خمس ضمانات ناجحة ورا بعض... خلص سلموه القعدة وروحوا 😂', durationMs: 5600 },
  { id: 'failure-streak-3', eventId: 'failure-streak-3', message: 'ثالث انكسار ورا بعض... شريكك بلش يدور على شريك جديد 🤣', durationMs: 5600 }
];

function createTarneebRules(): MessageRule[] {
  const normal = [
    ...TARNEEB_SUCCESS_MESSAGES.map((item) => ({ ...item, category: 'tarneeb-success' as const, event: 'tarneeb-success' as const })),
    ...TARNEEB_FAILURE_MESSAGES.map((item) => ({ ...item, category: 'tarneeb-failure' as const, event: 'tarneeb-failure' as const })),
    ...TARNEEB_PRIVATE_FAILURE_MESSAGES.map((item) => ({ ...item, category: 'tarneeb-failure' as const, event: 'tarneeb-failure' as const }))
  ].map((item): MessageRule => ({ id: item.id, factoryId: item.id, alternativeGroupId: item.event, category: item.category, gameTypes: ['tarneeb-61'], event: item.event, template: item.message, durationMs: 4600, enabled: true, priority: 20, intensity: 4, createdAt: now, updatedAt: now }));
  return [...normal, ...specialTarneeb.map((item): MessageRule => ({ id: item.id, factoryId: item.id, alternativeGroupId: item.eventId, category: 'tarneeb-special', gameTypes: ['tarneeb-61'], event: 'tarneeb-special', template: item.message, durationMs: item.durationMs, enabled: true, priority: 100, intensity: 4, createdAt: now, updatedAt: now }))];
}

let factoryCache: MessageRule[] | undefined;
export function factoryMessageRules(): MessageRule[] {
  factoryCache ??= [...createLashRules(), ...createTrixRules(), ...createOldManRules(), ...createTarneebRules()];
  return factoryCache.map((rule) => ({ ...rule, gameTypes: [...rule.gameTypes] }));
}

export function effectiveMessageRules(overrides: MessageRule[]): MessageRule[] {
  const factory = factoryMessageRules();
  const byFactory = new Map(overrides.filter((rule) => !rule.userAdded).map((rule) => [rule.factoryId, rule]));
  const effective = factory.map((rule) => {
    const override = byFactory.get(rule.factoryId);
    return override ? { ...rule, template: override.template, enabled: override.enabled, durationMs: override.durationMs, updatedAt: override.updatedAt } : rule;
  });
  return [...effective, ...overrides.filter((rule) => rule.userAdded)];
}

export function interpolateTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: keyof TemplateValues) => values[key] === undefined ? match : String(values[key]));
}

export function matchingMessages(rules: MessageRule[], context: MessageContext, event: MessageRule['event']): MessageRule[] {
  const intensity = context.intensity ?? 4;
  return rules.filter((rule) => rule.enabled && rule.event === event && rule.gameTypes.includes(context.game.gameType) && (!rule.trixMode || rule.trixMode === context.game.trixMode) && (rule.intensity ?? 1) <= intensity &&
    (rule.minScore === undefined || (context.ownerScore ?? 0) >= rule.minScore) && (rule.maxScore === undefined || (context.ownerScore ?? 0) <= rule.maxScore) &&
    (rule.ownerScore === undefined || rule.ownerScore === context.ownerScore) && (rule.partnerScore === undefined || rule.partnerScore === context.partnerScore) &&
    (rule.doubled === undefined || rule.doubled === context.doubled) && (rule.minOccurrences === undefined || (context.occurrences ?? 0) >= rule.minOccurrences));
}

export function renderMessage(rule: MessageRule, context: MessageContext): string {
  const partnerId = partnerForPlayer(context.owner.id, context.game.teams);
  const ownerTeam = teamForPlayer(context.owner.id, context.game.teams);
  const opponentTeam = context.game.teams?.find((team) => team.id !== ownerTeam?.id);
  const opponentId = opponentTeam?.playerIds[0];
  return interpolateTemplate(rule.template, {
    owner: context.owner.name,
    player: context.game.players.find((player) => player.id === context.eaterPlayerId)?.name ?? context.owner.name,
    partner: context.game.players.find((player) => player.id === partnerId)?.name ?? 'صاحبنا',
    opponent: context.game.players.find((player) => player.id === opponentId)?.name ?? 'باقي الطاولة',
    score: context.ownerScore,
    absScore: Math.abs(context.ownerScore ?? 0),
    team: ownerTeam?.name ?? context.owner.name,
    opponentTeam: opponentTeam?.name ?? 'باقي الطاولة',
    target: context.target,
    count: context.occurrences
  });
}

export function pickMessage(rules: MessageRule[], previous?: string | string[], random: () => number = Math.random): MessageRule | undefined {
  if (!rules.length) return undefined;
  const excluded = new Set(Array.isArray(previous) ? previous : previous ? [previous] : []);
  const available = rules.filter((rule) => !excluded.has(rule.id));
  const pool = available.length ? available : rules;
  return pool[Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))];
}

const MESSAGE_HISTORY_KEY = 'kok-recent-message-ids';
export function readRecentMessageIds(): string[] {
  try { const parsed = JSON.parse(localStorage.getItem(MESSAGE_HISTORY_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string').slice(-20) : []; } catch { return []; }
}
export function rememberMessageId(id: string): void {
  const recent = readRecentMessageIds().filter((item) => item !== id);
  recent.push(id);
  localStorage.setItem(MESSAGE_HISTORY_KEY, JSON.stringify(recent.slice(-20)));
}
