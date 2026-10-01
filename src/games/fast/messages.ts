import type { GamePlayer, GameSession, MessageRule } from '../../types';
import { TARNEEB_FAILURE_MESSAGES, TARNEEB_PRIVATE_FAILURE_MESSAGES, TARNEEB_SUCCESS_MESSAGES, brokenSevenMessage, kabootMessage } from '../tarneeb/reactions';
import { partnerForPlayer, teamForPlayer } from './scoring';

export type TemplateValues = Partial<Record<'owner' | 'player' | 'partner' | 'score' | 'absScore' | 'team' | 'opponent' | 'opponentTeam' | 'margin' | 'kingdom' | 'target' | 'winner' | 'loser' | 'count', string | number>>;
export type MessageContext = { game: GameSession; owner: GamePlayer; ownerScore?: number; partnerScore?: number; eaterPlayerId?: string; doubled?: boolean; occurrences?: number; target?: number; intensity?: 1 | 2 | 3 | 4 };

const now = '2026-10-01T00:00:00.000Z';
type LashBand = { id: string; minScore?: number; maxScore?: number; required: string; count: number; intensity: 1 | 2 | 3 | 4 };
export const LASH_BANDS: LashBand[] = [
  { id: 'positive', minScore: 1, required: 'حجي قوم مد الغالي بالقعدة خلي الشباب تاخد الرضا', count: 18, intensity: 1 },
  { id: '0-to-50', minScore: -50, maxScore: 0, required: 'عاااااش يا وحش الـ{absScore} ولا شي', count: 18, intensity: 1 },
  { id: '51-to-100', minScore: -100, maxScore: -51, required: 'حلوة ودليل على فهم {owner}', count: 18, intensity: 1 },
  { id: '101-to-200', minScore: -200, maxScore: -101, required: 'لا بأس حجي لا بأس مقبولة نوعاً ما', count: 20, intensity: 2 },
  { id: '201-to-249', minScore: -249, maxScore: -201, required: 'شو الترتيب يابا شو هالنتيجة الخرا', count: 28, intensity: 2 },
  { id: 'exact-250', minScore: -250, maxScore: -250, required: 'يلا انقسمت بيناتنا', count: 28, intensity: 2 },
  { id: '251-to-300', minScore: -300, maxScore: -251, required: 'شو هاد حمار سبحان مين حجبك عن أكل التبن', count: 30, intensity: 3 },
  { id: '301-to-350', minScore: -350, maxScore: -301, required: 'خراي عليك وعالشدة وعاللي مسكك ورق شدة وقلك بتفهم تلعب', count: 35, intensity: 3 },
  { id: '351-to-400', minScore: -400, maxScore: -351, required: 'قوم ع بيتكن ايري فيك وباللي اتصل فيك وعزمك عالقعدة يلا حجي يلا ع بيتكن', count: 40, intensity: 4 },
  { id: '401-to-450', minScore: -450, maxScore: -401, required: 'شوووووو هاللعب المأير هاد ع شوي رح توصل لمستوى منذر طبانة بالبهم', count: 42, intensity: 4 },
  { id: '451-to-499', minScore: -499, maxScore: -451, required: 'اووووووووووووه لعب كلاب هاد مو لعب بني آدمين ...شو يا {owner} مو حاسس حالك حمار ...تريك ورق هالشدة وقوم شوف مستقبلك بغير مكان', count: 44, intensity: 4 },
  { id: '500-or-less', maxScore: -500, required: 'يا جماعة واضحة ......خلونا نقوم نعمل فرشاية لـ {owner} .....طيزو محجوزة لأبو عمر شفلك مكان تاني وغزو منو', count: 46, intensity: 4 }
];

const goodRoasts = [
  'بيان رسمي: {owner} طلع من الجولة نظيف وترك الباقي يغسلوا وراه.',
  'المعلّق الرياضي فقد صوته: {team} لعبها على الواقف والنتيجة {score}.',
  'يا شباب حدا يفتّش الورق، {owner} شكله مخبّي مخ إضافي.',
  'مكالمة عاجلة من البيت: رجّعولنا {owner} بعد ما خلص استعراض.',
  'تقرير المدرسة: فهم ممتاز، سلوك مشاغب، واللطشة بس {absScore}.',
  'المملكة أعلنت عطلة رسمية احتفالاً بنجاة {team}.',
  'مقابلة عمل قصيرة: شو خبرتك؟ قالهم نتيجة {score} وسكت.',
  'خبر عاجل: {owner} اكتشف إن الورق بينلعب بالعقل مو بالصراخ.',
  'صفقوا للزلمة، مرق من اللطش كأنه معه واسطة بالمملكة.',
  'الشريك عم يطلع عالسما ويقول الحمد لله طلعت القعدة مستورة.',
  'هالجولة بدها برواز؛ {team} عامل شغل مرتب زيادة عن اللزوم.',
  'المنافسين طلبوا فحص منشطات بعد نتيجة {score}.',
  'يا {partner} دير بالك عليه، اليوم صاحي وعم يفهم.',
  'المخرج طلب إعادة اللقطة لأن أداء {owner} مو مصدّق.',
  'نشرة الطقس: أجواء صافية فوق مملكة {owner} وعواصف عند الخصوم.',
  'حتى الختيار وقف وصفق لهالترتيب.',
  'الدكتور قال حالته مستقرة، بس عنده ارتفاع مفاجئ بالفهم.',
  'هاي مو جولة، هاي رسالة تهديد لباقي الطاولة.'
];

const badRoasts = [
  'خبر عاجل: تم إخلاء مملكة {owner} بعد تسجيل {score}.',
  'تقرير الشرطة: آخر مرة شافوا الفهم كان قبل ما يمسك {owner} الورق.',
  'يا {partner} معك حق تطلب تعويض نهاية خدمة بعد هالجولة.',
  'إعلان وفاة مهارة اللعب؛ الدفن بعد القعدة والعزاء عند {team}.',
  'المستشفى طلب زمرة دم للشراكة بعد نتيجة {score}.',
  'مقابلة العمل انتهت لما قالهم {owner} إنه بيعرف يلعب شدة.',
  'المدرسة رجعت دفتر العلامات: لعب صفر، ثقة بالنفس مليون.',
  'المعلّق الرياضي قال ما عاد يقدر يوصف المصيبة وترك الاستديو.',
  'اتصلوا بأهل {owner}، ابنكن عم يوزع نقاط عالناس.',
  'وزارة الكوارث فتحت فرع جديد جوّا مملكة {owner}.',
  'بيان الشراكة: {partner} بريء من كل ما فعله {owner}.',
  'القاضي حكم بحل فريق {team} فوراً ومنع إعادة التجربة.',
  'هالـ{absScore} مو نتيجة؛ هاد طلب استقالة بخط اليد.',
  'الجمهور هتف: بدّلوا {owner} قبل ما يكمّل تخريب.',
  'فحص النظر طلع سليم، المشكلة إن القرار نفسه خربان.',
  'المملكة بحاجة ترميم، تأمين، ومعجزة صغيرة.',
  'يا {opponentTeam} مبروك، الخصم عم يلعب معكن بدون ما يعرف.',
  'تقرير فني: الورق جيد، الطاولة جيدة، {owner} هو المشكلة.',
  'الشريك فتح تطبيق وظائف وهو لسه قاعد حدك.',
  'المذيع قال نعتذر عن المشاهد القاسية ثم عرض النتيجة.',
  'حدا يعطيه كاسة مي ويشرحله من أول وجديد شو عم نلعب.',
  'هالجولة تصلح دليل جنائي ضد صاحب المملكة.',
  'المحفّز النفسي وصل، شاف النتيجة وطلب إجازة.',
  'المقبرة رفضت تستقبل اللعب لأنه ميت من زمان.',
  'يا جماعة لا تضحكوا، يمكن {owner} مفكر الأعلى بالسالب أحسن.',
  'الشراكة عم تطلب لجوء إنساني عند الفريق الثاني.',
  'مسرحية من فصل واحد: دخل {owner} وانهارت المملكة.',
  'المدرب رسم الخطة، {owner} أكل الورقة والخطة سوا.',
  'هاي النتيجة بدها ولي أمر وتوقيع وتعهد بعدم التكرار.',
  'المنافس ما ربح؛ {owner} هو اللي سلّمه الفوز مغلف.',
  'الورق عم يطالب بحقوقه بعد سوء الاستخدام.',
  'حالة طوارئ: الشريك اكتشف متأخر إنه شريك الكارثة.',
  'دقيقة صمت على النقاط اللي راحت وما رح ترجع.',
  'الحي كله سمع صوت انهيار المملكة.',
  'اتصلوا بالدفاع المدني، في فهم محشور تحت النتيجة.',
  'حتى الخصم صار ينصحه من كتر الشفقة.',
  'خطة {owner}: نبلش سيئين وبعدين نصير أسوأ.',
  'تم سحب رخصة اللعب حتى إشعار آخر.',
  'يا {partner} إذا بدك تغيّر شريك هلق أحسن وقت.',
  'المملكة انباعت خردة بعد هالنتيجة.',
  'المحاسب رفض يسجل الرقم وقال هاد مو منطقي.',
  'دورة تدريبية عاجلة بعنوان: كيف لا تعمل متل {owner}.',
  'المخرج صنّف الجولة رعب، كوميديا، وكارثة بنفس الوقت.',
  'آخر خبر: {team} عم يدور على زر تراجع بالحياة.',
  'المعنويات بخير، أما النقاط فالله يرحمها.',
  'وصل كتاب رسمي: ممنوع {owner} يقرب عالورق لحاله.'
];

const trixDefaults: Array<[number, number, string]> = [
  [200, 150, 'جوني سنس وشريكو'], [200, 100, 'لعب معلمين هاد'], [200, 50, 'يلا شي بعوض شي'],
  [150, 200, 'جوني سنس وشريكو'], [150, 100, 'يلا مقبولة'], [150, 50, 'كس اخت هالتسماية'],
  [100, 200, 'ولله يا {owner} شريكك أفهم منك'], [100, 150, 'يلا مقبولة'], [100, 50, 'ورق خرا وشراكة ع أخرا'],
  [50, 200, 'معلم {partner} الله يعينك على هالحمار'], [50, 150, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة'], [50, 100, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة']
];

const trixAlternatives = [
  '{owner} و{partner} دخلوا السباق وتركوا الباقي يعدّ الغبرة.',
  'الشراكة اليوم يا ذهب يا خردة، والنتيجة حكت لحالها.',
  'المعلّق: صاحب المملكة {owner} وشريكه {partner} عاملين فيلم كامل.',
  'تقرير التركس: واحد شال الفريق والثاني شال همّه.',
  'يا {team} هالتسماية بدها تصفيق ولا لجنة تحقيق؟',
  'الترتيب كشف كل شي؛ ما عاد في مجال للحكي الفاضي.',
  'واحد وصل بكير والثاني كان عم يسأل وين الطريق.',
  'اجتماع الشراكة بعد الجولة: مين يشكر مين ومين يعتذر لمين؟',
  'خبر عاجل من خط النهاية: {owner} وصل و{partner} لحقه عالقد.',
  'هاي الشراكة بدها كأس إذا نجحت ومحامي إذا كملت هيك.',
  'الخصوم عم يراجعوا الفيديو، واللقطة واضحة بلا VAR.',
  'الورق أعطى حكمه: في معلم وفي واحد عم يتعلّم.',
  'تركس اليوم كشف مين بيسوق ومين راكب بالبكم.',
  'النتيجة انكتبت، والعتب صار محفوظ لجلسة ما بعد المباراة.',
  'يا صاحب المملكة، شريكك عم يطلع عليك نظرة فيها ألف سؤال.',
  'الخط النهائي استقبل أربعة، بس مو كلهم وصلوا بكرامتهم.',
  'مسرح التركس قدّم عرض شراكة ما بين البطولة والمصيبة.',
  'التسماية خلصت؛ هلأ بلش توزيع المسؤوليات والفضايح.',
  'إذا هاي خطة مشتركة، لازم نعرف مين وافق عليها.',
  'التقرير النهائي: {owner} {score} وشريكه حاضر بالقصة كلها.',
  'صفقوا للفريق أو عزّوه، حسب اللي فهمتوه من الترتيب.',
  'الشريك الأفضل واضح، بس خلونا ساكتين كرمال المحبة.',
  'التركس ما بيكذب؛ المراكز فضحت الإدارة كاملة.',
  'اليوم الشراكة اجت بنكهة أكشن وكوميديا سوداء.'
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
  return LASH_BANDS.flatMap((band) => {
    const source = band.intensity <= 1 ? goodRoasts : badRoasts;
    const templates = repeatPool(band.required, source, band.count);
    return (['fast-lash', 'cc-lash'] as const).flatMap((category) => templates.map((template, index): MessageRule => ({
      id: `${category}-${band.id}-${index + 1}`, factoryId: `${category}-${band.id}-${index + 1}`, alternativeGroupId: `${category}-${band.id}`,
      category, gameTypes: category === 'fast-lash' ? ['trix-fast'] : ['cc'], event: 'lash-owner-score', minScore: band.minScore, maxScore: band.maxScore,
      template, durationMs: 5000, enabled: true, priority: 20, intensity: index === 0 ? band.intensity : Math.min(4, (index % 4) + 1) as 1 | 2 | 3 | 4,
      createdAt: now, updatedAt: now
    })));
  });
}

function createTrixRules(): MessageRule[] {
  return trixDefaults.flatMap(([ownerScore, partnerScore, required]) => repeatPool(required, trixAlternatives, 18).map((template, index): MessageRule => ({
    id: `fast-trix-${ownerScore}-${partnerScore}-${index + 1}`, factoryId: `fast-trix-${ownerScore}-${partnerScore}-${index + 1}`, alternativeGroupId: `fast-trix-${ownerScore}-${partnerScore}`,
    category: 'fast-trix', gameTypes: ['trix-fast'], event: 'trix-partnership', ownerScore, partnerScore, template, durationMs: 5000, enabled: true, priority: 30,
    intensity: Math.min(4, (index % 4) + 1) as 1 | 2 | 3 | 4, createdAt: now, updatedAt: now
  })));
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
  return rules.filter((rule) => rule.enabled && rule.event === event && rule.gameTypes.includes(context.game.gameType) && (rule.intensity ?? 1) <= intensity &&
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
