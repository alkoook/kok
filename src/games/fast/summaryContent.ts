import type { ContentOverride, SummarySegmentCategory } from '../../types';

export type SummarySegment = { id: string; factoryId: string; category: Exclude<SummarySegmentCategory, 'title'>; template: string; tags: string[]; enabled: boolean };
export type TitleSignal = 'champion' | 'runner-up' | 'loser' | 'blowout-winner' | 'catastrophic-loser' | 'comeback' | 'collapse' | 'trix-master' | 'trix-last' | 'old-man' | 'doubled-old-man' | 'great-kingdom' | 'terrible-kingdom' | 'partnership-best' | 'partnership-disaster' | 'cc-master' | 'cc-disaster' | 'consistent' | 'chaotic' | 'carried-partner' | 'carried-by-partner' | 'owner-disaster' | 'trix-partner-mismatch' | 'repeated-record' | 'close-finish';
export type TitleDefinition = { id: string; factoryId: string; category: 'title'; signal: TitleSignal; template: string; enabled: boolean };

const compose = (category: SummarySegment['category'], count: number, frames: string[], facts: string[], tags: string[] = []): SummarySegment[] => {
  if (count > frames.length * facts.length) throw new Error(`محتوى ${category} لا يملك تراكيب كافية`);
  return Array.from({ length: count }, (_, index) => {
    const frame = frames[index % frames.length];
    const fact = facts[Math.floor(index / frames.length) % facts.length];
    const template = frame.replace('{fact}', fact);
    return { id: `${category}-${index + 1}`, factoryId: `${category}-${index + 1}`, category, template, tags, enabled: true };
  });
};

const reportFrames = [
  '{fact}', 'المعلّق من طرف الطاولة لخصها هيك: {fact}', 'بالمحضر الرسمي للقعدة انكتب: {fact}', 'الكاميرا البطيئة أثبتت أن {fact}',
  'شاهد عيان من جنب إبريق الشاي قال إن {fact}', 'بعد مراجعة كل الجولات، الحكم النهائي: {fact}', 'في الوثائقي الذي لن توافق العائلة على عرضه: {fact}',
  'النشرة المسائية قطعت برامجها لتعلن أن {fact}', 'من غرفة التحليل، الخبراء اتفقوا أن {fact}', 'ولو تحولت الليلة إلى عنوان جريدة فسيكون: {fact}'
];
const dramaticFrames = [
  'أُطفئت الأنوار لحظة، ثم ظهر على الشاشة أن {fact}', 'مع أول ورقة بدأت الحكاية، ومع آخر ورقة عرفنا أن {fact}', 'دخل الأربعة وهم أصحاب، وغادر سجل النقاط وهو يقول إن {fact}',
  'الهدوء الذي سبق الجولة كان كاذبًا؛ لاحقًا اكتشفنا أن {fact}', 'الموسيقى التصويرية ارتفعت بالضبط عندما صار واضحًا أن {fact}', 'لو كانت القعدة فيلمًا، فالمشهد الذي قلب الحبكة هو أن {fact}',
  'قبل أن يبرد الشاي تبدلت كل التوقعات لأن {fact}', 'الراوي حاول يبقى محايدًا، لكنه اضطر للاعتراف بأن {fact}', 'من أول مملكة لآخر حساب ظل السؤال: كيف انتهى بنا الأمر إلى أن {fact}',
  'في ليلة عادية جدًا حدث الشيء غير العادي: {fact}'
];
const openingFacts = [
  'الورق انخلط والنيات انكشفت من أول مملكة.', 'الطاولة استقبلت أربعة لاعبين وأعادت اثنين منهم بحاجة إلى مراجعة.', 'الوعود بالفهم كانت كثيرة، والدليل الرقمي كان أقل حماسًا.',
  'الممالك بدأت مرتبة ثم دخلت الحسابات وانهار البروتوكول.', 'الضحك سبق التسجيل، لكن التسجيل هو الذي بقي شاهدًا.', 'كل واحد دخل بخطة، والنقاط قررت اعتماد خطة خامسة.',
  'أول لطشة فتحت ملفًا لم يُغلق حتى نهاية القعدة.', 'الليلة بدأت منافسة وانتهت لجنة تحقيق بين الشركاء.', 'التاج دار على أربعة رؤوس ولم ينجُ منها كلها.', 'النتيجة كانت تكتب قصتها بينما اللاعبون يكتبون أعذارهم.'
];

const winnerFacts = [
  '{winner} أخذ الصدارة بفارق {margin} وترك الاعتراضات للنسخة القادمة.', '{winner} عرف متى يهاجم ومتى يترك الخصم يهدم نفسه.', 'النتيجة اختارت {winner} لأن الكلام وحده لا يدخل جدول النقاط.',
  '{winner} أغلق الحساب قبل أن تنتهي لجنة صياغة الأعذار.', 'التاج استقر عند {winner} بعدما رفض بقية المرشحين تحمّل المسؤولية.', '{winner} حوّل الممالك المتفرقة إلى طريق واضح نحو الفوز.',
  'كلما اقترب الخصم، وجد {winner} جولة جديدة تقفل الباب.', '{winner} لعب آخر المنعطفات كأنه يعرف النهاية مسبقًا.', 'الفارق {margin} ليس رأيًا؛ إنه إيصال استلام باسم {winner}.',
  '{winner} خرج بالنتيجة والهيبة وترك الباقي يتقاسمون التحقيق.', 'الفوز لم يصل صدفة؛ {winner} جمعه جولة وراء جولة.', 'لما صار الضغط حقيقيًا، ظهر {winner} واختفى ضجيج المنافسين.'
];
const disasterFacts = [
  '{loser} قدّم نتيجة تصلح تدريبًا للدفاع المدني.', 'الرقم {score} لم يكن خسارة فقط؛ كان طلب صيانة شاملًا.', 'أسوأ لطشة تركت الفريق يبحث عن بند فسخ الشراكة.',
  'المملكة المنكوبة انتهت قبل أن يفهم صاحبها أنها بدأت.', 'الخصم لم يحتج إلى خطة لأن الكارثة تكفلت بكل شيء.', '{loser} وزّع النقاط بسخاء لا تسمح به ميزانية الفريق.',
  'الآلة الحاسبة عرضت الرقم {score} ثم طلبت إجازة نفسية.', 'الورق كان بريئًا، والطاولة كانت ثابتة، وبقي المتهم واضحًا.', 'هناك جولة ستبقى في السجل كتحذير للأجيال القادمة.',
  'صوت انهيار المملكة وصل إلى الجيران قبل تحديث لوحة النتيجة.', 'المصيبة لم تأت دفعة واحدة؛ دخلت مرتبة وجلست في الصدارة.', 'الشريك تابع المشهد بنظرة شخص اكتشف العقد بعد التوقيع.',
  'تم فتح ملف بعنوان كيف تخسر النقاط والكرامة في حركة واحدة.', 'كل الأعذار كانت مقنعة حتى ظهر الرقم النهائي على الشاشة.', '{loser} صنع للخصم فوزًا جاهزًا مع تغليف وتسليم مجاني.'
];
const partnershipFacts = [
  '{winner} لعبوا بعقلين متفاهمين، بينما الجهة الثانية عقدت اجتماع لوم مفتوحًا.', 'الشراكة الرابحة عرفت أن المقعدين 1 و3 مشروع فريق لا مجرد ترتيب.', 'فريق حمل بعضه عند الضغط، وفريق حمل بعضه المسؤولية فقط.',
  'التعاون ظهر في النقاط قبل أن يظهر في الكلام.', 'أفضل شراكة أغلقت الثغرات، والأسوأ فتحت أبواب المملكة كلها.', 'الشريك الحقيقي ظهر عندما صارت الجولة أثقل من لاعب واحد.',
  'الفريق المنسجم تقاسم القرار؛ الفريق الآخر تقاسم الأعذار.', 'في جهة كانت هناك مساندة، وفي الجهة الأخرى مراسلات فسخ عقد.', 'الفارق بين الشراكتين كان خطة مشتركة من طرف وتحقيقًا داخليًا من الطرف الثاني.',
  'شريكان خرجا كتفًا بكتف، وشريكان خرج كل واحد يشير إلى الآخر.'
];
const trixFacts = [
  'التركس كشف من يحفظ خط النهاية ومن يحتاج خريطة.', '{player} جمع المراكز الأولى كأنه حجزها قبل بداية القعدة.', '{loser} تعرّف إلى المركز الرابع أكثر مما تسمح به المصادفة.',
  'ترتيب 200 و150 و100 و50 وزّع الهيبة بلا مجاملة.', 'صاحب الوصول المبكر رفع فريقه، والمتأخر ترك شريكه يسحب الحمل.', 'الفارق بين الشريكين ظهر واضحًا عندما بدأ سباق التركس.',
  'كل تسمية كانت تصويتًا جديدًا على من يفهم ومن يتفرج.', 'خط النهاية لم يقبل الأعذار؛ سجّل الوصول كما حدث بالضبط.', 'هناك لاعب كان يسبق الورق، وآخر كان الورق ينتظره بلا فائدة.',
  'مجموع المراكز الفردية شرح نتيجة الفريق أفضل من أي خطاب.'
];
const kingdomFacts = [
  'المملكة {kingdom} بنت الفارق الذي عاش حتى النهاية.', 'أقوى مملكة تحولت إلى منصة إطلاق للمتصدر.', 'أسوأ مملكة تركت تاجها تحت الطاولة وطلبت الانسحاب.',
  'صاحب المملكة الناجحة حمى عرشه بالنقاط لا بالصوت.', 'التحول الحقيقي بدأ عندما تبدلت دلتا إحدى الممالك بالكامل.', 'كل مملكة تركت أثرًا، لكن واحدة فقط غيرت اتجاه القصة.',
  'الفريق الأقوى ربح تفاصيل المملكة قبل أن يربح مجموعها.', 'هناك ملك اشتغل كمدير أزمة، وملك آخر صار الأزمة نفسها.', 'سجل الممالك حفظ أفضل إنقاذ وأسوأ انهيار دون رتوش.',
  'المملكة التي بدت هادئة انتهت صاحبة أعلى تأثير في النتيجة.'
];
const oldManFacts = [
  '{player} أكل الختيار وترك الواقعة موثقة باسم الجولة.', 'الختيار اختار ضحيته بدقة أكبر من دقة بعض اللاعبين بالورق.', 'عدد الختايرة المأكولين صار إحصاءً يحتاج جدولًا مستقلًا.',
  'آكل الختيار حاول ينسى، لكن الحفظ المحلي لم يتعاون.', 'الختيار دخل المملكة كضيف وخرج مالكًا لجزء من النتيجة.', 'تكرار الحادثة نقلها من سوء حظ إلى اختصاص رسمي.',
  'كل ظهور للختيار حمل معه فاتورة ولقبًا جديدًا.', 'صاحب الرقم الأعلى في الختيار بات عنوانًا معروفًا للتوصيل.', 'المملكة نجت من أشياء كثيرة، لكن الختيار وجد طريقه في النهاية.',
  'السجل حدّد من يجذب الختيار حتى عندما تتغير المقاعد.'
];
const doubledFacts = [
  'الختيار المدبل حوّل الحادثة العادية إلى ملف جنائي كامل.', '{player} جمع الختيار والتدبيل في لقطة لا تحتاج إعادة.', 'التدبيل رفع ثمن الغلطة وترك أثره في النتيجة واللقب.',
  'صاحب الختيار المدبل لم يخسر نقاطًا فقط؛ خسر حق الاعتراض المؤقت.', 'الضربة المزدوجة وصلت في أسوأ توقيت ممكن.', 'التاج والختيار والتدبيل اجتمعوا في مشهد واحد ضد صاحبه.',
  'الختيار المدبل دخل السجل من الباب الذي لا يُغلق.', 'حتى الشريك لم يجد جملة مواساة تناسب حجم التدبيل.', 'المملكة احتاجت إعادة إعمار بعد مرور الختيار المدبل.',
  'تكرار التدبيل أثبت أن الحادثة لم تعد مصادفة عابرة.'
];
const comebackFacts = [
  '{winner} كان خارج الصورة ثم عاد وسحب التاج من آخر الحكاية.', 'الفريق المتأخر قلّص الفارق جولة جولة حتى تبدل صاحب الصدارة.', 'الخصم اطمأن مبكرًا، وكانت تلك أول خطوة في القلبة.',
  'العودة بدأت بنقطة صغيرة وانتهت بفارق {margin}.', 'النتيجة غيرت اتجاهها بعدما رفض المتأخر توقيع الاستسلام.', 'آخر مملكتين حولتا الخسارة المتوقعة إلى فوز موثق.',
  'القلبة لم تكن ضربة حظ؛ كانت سلسلة قرارات صحيحة متأخرة.', 'المتصدر السابق شاهد الفارق يذوب ولم يجد زر إيقاف.', 'من قاع اللوحة إلى أولها، الطريق كان قصيرًا ومؤلمًا للخصم.',
  'كل تحديث للنتيجة كان يعلن فصلًا جديدًا من العودة.'
];
const collapseFacts = [
  'الصدارة كانت مضمونة تقريبًا قبل أن يبدأ الانهيار المنظم.', 'الفريق الذي تقدم مبكرًا صرف كل رصيده دفعة واحدة.', 'الممالك الأخيرة حولت الراحة إلى ذعر والحسم إلى ندم.',
  'الانهيار بدأ بخطأ صغير ثم وجد من يطعمه جولات إضافية.', 'المتصدر فقد الاتجاه في اللحظة التي احتاج فيها إلى الثبات.', 'النتيجة لم تنقلب وحدها؛ هناك فريق دفعها بيديه نحو الخصم.',
  'كل ما بُني في البداية سقط في جولة واحدة سيئة التوقيت.', 'الفريق المنهار شاهد الفارق يهرب ولم يملك إلا الأعذار.', 'الصدارة خرجت من الباب بينما كان أصحابها يحتفلون مبكرًا.',
  'آخر الحساب كشف أن الأمان الوهمي أغلى من أي لطشة.'
];
const funnyFacts = [
  'عدد مرات المركز الرابع بلغ {fourthCount}؛ رقم يحتاج اشتراك مواصلات إلى خط النهاية.', 'الختيار زار اللاعبين {oldManCount} مرة؛ أكثر من بعض الأقارب.', 'التدبيل ظهر {doubledCount} مرة ورفع ضغط الطاولة بنفس النسبة.',
  'أكبر لطشة فريق كانت {score}؛ شركة التأمين رفضت فتح المطالبة.', 'تغيّرت الصدارة {leadChanges} مرة؛ حتى اللوحة أصابها دوار.', 'الفريق الأقوى ربح {kingdomWins} ممالك من أصل أربع.',
  'صاحب المملكة أنهى خلف شريكه في التركس {ownerBehindPartner} مرة.', 'أكبر حركة نقاط بلغت {largestSwing}؛ كافية لنقل المباراة إلى عنوان جديد.', 'متوسط مركز صاحب النصيب الأغرب كان {averagePlacement}.',
  'أخف ضرر في اللطش توقف عند {bestLash} وكأنه إنجاز هندسي.'
];
const closingFacts = [
  'انتهت القعدة، لكن لجنة التحقيق بين الشركاء ما زالت منعقدة.', 'احفظوا النتيجة الآن قبل أن تبدأ إعادة كتابة التاريخ.', 'التاج حُسم والفضايح بقيت محفوظة أوفلاين.',
  'الورق عاد إلى العلبة، أما الألقاب فستبقى حتى إشعار آخر.', 'الفائز أخذ الصورة، والخاسر أخذ قائمة طويلة من النصائح.', 'انتهى اللعب وبدأت رسميًا مرحلة إنكار المسؤولية.',
  'الجولة الأخيرة أغلقت الحساب وفتحت باب السخرية.', 'القصة انتهت رقميًا، لكنها ستُروى في القعدة القادمة بشكل أسوأ.', 'أعيدوا الكراسي إلى مكانها واتركوا الأعذار خارج السجل.',
  'موعدنا القادم مع خطط جديدة ونتائج لا تحترم الخطط.'
];

const openings = [...compose('opening', 30, reportFrames, openingFacts, ['opening']), ...compose('dramatic-opening', 30, dramaticFrames, openingFacts, ['opening', 'dramatic'])];
const winners = [...compose('winner', 70, reportFrames, winnerFacts, ['winner']), ...compose('blowout', 15, dramaticFrames, winnerFacts.map((fact) => `في الفوز الساحق، ${fact}`), ['winner', 'blowout']), ...compose('close-match', 15, dramaticFrames, winnerFacts.map((fact) => `في الحسم على الحافة، ${fact}`), ['winner', 'close'])];
const disasters = [...compose('disaster', 100, reportFrames, disasterFacts, ['disaster']), ...compose('loser', 40, dramaticFrames, disasterFacts, ['disaster', 'loser'])];
const partnerships = [...compose('partnership-praise', 40, reportFrames, partnershipFacts, ['partnership', 'praise']), ...compose('partnership-disaster', 40, dramaticFrames, partnershipFacts, ['partnership', 'disaster'])];
const trix = [...compose('trix-genius', 40, reportFrames, trixFacts, ['trix', 'praise']), ...compose('trix-disaster', 40, dramaticFrames, trixFacts, ['trix', 'disaster'])];
const kingdoms = [...compose('kingdom-praise', 40, reportFrames, kingdomFacts, ['kingdom', 'praise']), ...compose('kingdom-disaster', 40, dramaticFrames, kingdomFacts, ['kingdom', 'disaster'])];
const oldMen = [...compose('old-man', 60, reportFrames, oldManFacts, ['old-man']), ...compose('repeated-old-man', 20, dramaticFrames, oldManFacts, ['old-man', 'repeated'])];
const doubledOldMen = compose('doubled-old-man', 50, reportFrames, doubledFacts, ['old-man', 'doubled']);
const comebacks = [...compose('comeback', 30, reportFrames, comebackFacts, ['comeback']), ...compose('collapse', 30, dramaticFrames, collapseFacts, ['collapse'])];
const funnyCategories: SummarySegment['category'][] = ['mock-news', 'mock-medical', 'mock-police', 'mock-school', 'mock-job-review', 'fake-retirement', 'transfer-market', 'mock-obituary'];
const funnyLabels = ['خبر عاجل', 'التشخيص الطبي', 'محضر الشرطة', 'كشف العلامات', 'تقييم الموارد البشرية', 'بيان الاعتزال', 'سوق الانتقالات', 'نعي مهارة اللعب'];
const funnyStatistics = funnyCategories.flatMap((category, index) => compose(category, 10, index % 2 ? dramaticFrames : reportFrames, funnyFacts.map((fact) => `${funnyLabels[index]} يؤكد: ${fact}`), ['funny-stat', category]));
const closings = [...compose('closing', 30, reportFrames, closingFacts, ['closing']), ...compose('victory-closing', 20, dramaticFrames, closingFacts.map((fact) => `منصة التتويج تقول: ${fact}`), ['closing', 'victory']), ...compose('disaster-closing', 20, dramaticFrames.slice().reverse(), closingFacts.map((fact) => `قسم الأضرار يختم: ${fact}`), ['closing', 'disaster'])];
const gameSpecific = [...compose('cc', 20, reportFrames, disasterFacts.map((fact) => `في ملف CC تحديدًا، ${fact}`), ['cc']), ...compose('fast-trix', 20, dramaticFrames, trixFacts.map((fact) => `في تركس السريعة تحديدًا، ${fact}`), ['fast-trix'])];

const titleStems: Record<TitleSignal, string[]> = {
  champion: ['ملك القعدة', 'المعلم الرسمي', 'حامل التاج', 'قافل الحساب', 'زعيم الطاولة', 'صاحب الختم الأخير', 'كاسر الميزان', 'صاحب الكلمة الأخيرة'],
  'runner-up': ['وصيف تحت الاعتراض', 'قريب وما كفّى', 'واقف عباب التاج', 'الثاني الرسمي', 'نائب الملك المؤقت', 'صاحب نصف الفرحة', 'مطارد الصدارة', 'آخر المهددين'],
  loser: ['ممسحة القعدة', 'آخر الصف', 'صاحب الفاتورة', 'حامل الهم', 'مفقود النقاط', 'ضيف الترتيب الأخير', 'وريث الخسارة', 'صاحب العذر الجاهز'],
  'blowout-winner': ['داهس القعدة', 'صاحب الفوز الثقيل', 'مغلق باب المنافسة', 'فارق رعب', 'موزع الهزائم', 'المنتصر بلا رحمة', 'كاسح الممالك', 'صاحب المباراة من طرف واحد'],
  'catastrophic-loser': ['وزارة الكوارث', 'قسم الصيانة البشرية', 'بلاغ طوارئ متنقل', 'مقاول الهدم', 'صاحب اللطشة السوداء', 'مهندس الانهيار', 'عدو النتيجة', 'مشروع إعادة إعمار'],
  comeback: ['ملك القلبة', 'راجع من القبر', 'حرامي الصدارة', 'صاحب النفس الأخير', 'مهندس الريمونتادا', 'قالب الطاولة', 'عائد بلا موعد', 'رافض الاستسلام'],
  collapse: ['مضيّع الصدارة', 'هادم ما بناه', 'بطل الانهيار المتأخر', 'صاحب الفرحة المستعجلة', 'مسلّم التاج', 'منحدر الجولة الأخيرة', 'مفلس الأفضلية', 'منهار تحت الضغط'],
  'trix-master': ['ملك التركس', 'سيد المركز الأول', 'قاطع خط النهاية', 'أستاذ التسميات', 'صاروخ الترتيب', 'جامع الميتين', 'حاكم السباق', 'معلم الأربعة مراكز'],
  'trix-last': ['عدو التركس', 'ملك المركز الرابع', 'تايه عالخط', 'آخر الواصلين', 'صديق الخمسين', 'سائح التركس', 'مؤجل الوصول', 'خصم السرعة'],
  'old-man': ['ملك الختيار', 'حبيب الختيار', 'الختيار ساكن عنده', 'عنوان الختيار الدائم', 'مطعم الختيار', 'مضيف الختيار', 'رفيق الشيخ', 'صاحب الوجبة الملكية'],
  'doubled-old-man': ['ملك التدبيل', 'الختيار المدبل حافظ عنوانه', 'جامع المصيبتين', 'مضاعف الكارثة', 'صاحب الضربة المزدوجة', 'مدبل على راسو', 'خبير الختيار الثقيل', 'حامل التدبيل'],
  'great-kingdom': ['صاحب أقوى مملكة', 'ملك الممالك', 'باني العرش', 'حارس المملكة', 'صاحب القصر الحديدي', 'سيّد الدلتا', 'معلم المملكة', 'تاجه ثابت'],
  'terrible-kingdom': ['صاحب أسوأ مملكة', 'ممسحة المملكة', 'هادم القصر', 'ملك بلا مملكة', 'تاجه بالأرض', 'فاتح الحدود للخصم', 'وزارة انهيار الممالك', 'حارس نايم'],
  'partnership-best': ['شريك العمر', 'الفريق الحديدي', 'ثنائي الطوارئ', 'شراكة مختومة بالذهب', 'عقلان بنقاط واحدة', 'سندا بعض', 'فريق بلا شقوق', 'ثنائي الحسم'],
  'partnership-disaster': ['شريك النكبة', 'مؤسسة قيد التصفية', 'عقد بحاجة فسخ', 'فريق التحقيق الداخلي', 'خصمان بقميص واحد', 'شراكة تحت التجربة', 'ثنائي الأعذار', 'قسم الخسائر المشتركة'],
  'cc-master': ['معلم CC', 'سيّد السالب الأقل', 'قاهر اللطشتين', 'ملك النجاة', 'حاسب الخمسمية', 'حاكم CC', 'أخف الضررين', 'نظيف الممالك'],
  'cc-disaster': ['غريق CC', 'ملك الأربعة آلاف', 'دفتر ديون مفتوح', 'موزع الخمسمية', 'مقاول اللطش', 'الغريق الرسمي', 'صاحب المملكة المنكوبة', 'مدير السالب'],
  consistent: ['أهدى لاعب', 'ميزان القعدة', 'ثابت الخطوة', 'صاحب الأداء النظيف', 'ماكينة الاستقرار', 'اللاعب المضمون', 'هادئ وفعال', 'صاحب أقل مفاجآت'],
  chaotic: ['مولد الفوضى', 'روليت الطاولة', 'مفاجأة كل جولة', 'عدو التوقعات', 'قنبلة موقوتة', 'مدير الفوضى', 'صاحب الرسم البياني المجنون', 'متقلب الممالك'],
  'carried-partner': ['شايل الفريق ع ظهره', 'رافعة الشراكة', 'عمود الفريق', 'منقذ الشريك', 'نص الفريق الثقيل', 'حامل المؤسسة', 'الضمان الحقيقي', 'كتف الشراكة'],
  'carried-by-partner': ['راكب بالبكم', 'محمول مع الشحنة', 'شريك بالاسم', 'نجا بفضل غيره', 'راكب موجة الشريك', 'النصف الخفيف', 'مستفيد الشراكة', 'ضيف على الفوز'],
  'owner-disaster': ['ملك خرّب مملكته', 'هادم عرشه', 'صاحب التاج المقلوب', 'عدو مملكته', 'فاتح القصر للخصم', 'ملك بلا إدارة', 'مضيّع المملكة', 'انقلاب على نفسه'],
  'trix-partner-mismatch': ['شراكة بسرعتين', 'واحد سابق وواحد لاحق', 'ثنائي غير متزامن', 'فارق التوقيت', 'شريك ينتظر شريكه', 'فريق خطي نهاية', 'الأول والرابع المحدودة', 'تفاوت رسمي'],
  'repeated-record': ['كاسر السجل', 'صاحب الرقم التاريخي', 'مؤسس رقم جديد', 'محطم العدّاد', 'دخل الأرشيف', 'رقم غير قابل للدفاع', 'مالك الصفحة الجديدة', 'حدث الليلة التاريخي'],
  'close-finish': ['فائز بالشعرة', 'ناجي بآخر نقطة', 'ملك الفارق الصغير', 'صاحب الحسم الضيق', 'آخر نفس', 'فوز تحت المجهر', 'حاسم اللحظة الأخيرة', 'منتصر على الحافة']
};

export const FACTORY_TITLES: TitleDefinition[] = Object.entries(titleStems).flatMap(([signal, titles]) => titles.map((template, index) => ({ id: `title-${signal}-${index + 1}`, factoryId: `title-${signal}-${index + 1}`, category: 'title' as const, signal: signal as TitleSignal, template, enabled: true })));
export const FACTORY_SUMMARY_SEGMENTS: SummarySegment[] = [...openings, ...winners, ...disasters, ...partnerships, ...trix, ...kingdoms, ...oldMen, ...doubledOldMen, ...comebacks, ...funnyStatistics, ...closings, ...gameSpecific];

export function effectiveSummaryContent(overrides: ContentOverride[]): { segments: SummarySegment[]; titles: TitleDefinition[] } {
  const map = new Map(overrides.map((override) => [override.factoryId, override]));
  const apply = <T extends SummarySegment | TitleDefinition>(item: T): T => {
    const override = map.get(item.factoryId);
    return override ? { ...item, template: override.template ?? item.template, enabled: override.enabled ?? item.enabled } : item;
  };
  return { segments: FACTORY_SUMMARY_SEGMENTS.map(apply), titles: FACTORY_TITLES.map(apply) };
}

export const SUMMARY_CONTENT_COUNTS = {
  opening: openings.length, winner: winners.length, disaster: disasters.length, partnership: partnerships.length,
  trix: trix.length, kingdom: kingdoms.length, oldMan: oldMen.length, doubledOldMan: doubledOldMen.length,
  comebackCollapse: comebacks.length, funnyStatistics: funnyStatistics.length, closing: closings.length,
  cc: gameSpecific.filter((item) => item.category === 'cc').length, fastTrix: gameSpecific.filter((item) => item.category === 'fast-trix').length,
  titles: FACTORY_TITLES.length
};

export function normalizeSummaryTemplate(template: string, names: string[] = []): string {
  let normalized = template.toLocaleLowerCase('ar').replace(/\{[a-zA-Z]+\}/g, '{value}');
  for (const name of [...names].sort((a, b) => b.length - a.length)) normalized = normalized.replaceAll(name.toLocaleLowerCase('ar'), '{name}');
  return normalized.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/[^\p{L}\p{N}{}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

const tokenSet = (value: string) => new Set(value.split(' ').filter(Boolean));
export function templateSimilarity(first: string, second: string): number {
  const a = tokenSet(normalizeSummaryTemplate(first)); const b = tokenSet(normalizeSummaryTemplate(second));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 1;
}

export function validateSummaryCorpus(items: Array<SummarySegment | TitleDefinition>, similarityThreshold = 0.92): { exactDuplicates: string[][]; skeletonDuplicates: string[][]; nearDuplicates: Array<[string, string, number]> } {
  const exact = new Map<string, string[]>(); const skeleton = new Map<string, string[]>();
  const normalized = items.map((item) => normalizeSummaryTemplate(item.template));
  const tokens = normalized.map(tokenSet);
  items.forEach((item, index) => {
    exact.set(item.template, [...(exact.get(item.template) ?? []), item.id]);
    skeleton.set(normalized[index], [...(skeleton.get(normalized[index]) ?? []), item.id]);
  });
  const nearDuplicates: Array<[string, string, number]> = [];
  for (let left = 0; left < items.length; left += 1) for (let right = left + 1; right < items.length; right += 1) {
    const smaller = tokens[left].size <= tokens[right].size ? tokens[left] : tokens[right];
    const larger = smaller === tokens[left] ? tokens[right] : tokens[left];
    let intersection = 0;
    for (const token of smaller) if (larger.has(token)) intersection += 1;
    const union = tokens[left].size + tokens[right].size - intersection;
    const similarity = union ? intersection / union : 1;
    if (similarity >= similarityThreshold && normalized[left] !== normalized[right]) nearDuplicates.push([items[left].id, items[right].id, similarity]);
  }
  return { exactDuplicates: [...exact.values()].filter((ids) => ids.length > 1), skeletonDuplicates: [...skeleton.values()].filter((ids) => ids.length > 1), nearDuplicates };
}
