const roasts = [
  'باختصار: الزلمة ما لعب ورق هالأسبوع، الورق لعب فيه.', 'دخل الأسبوع لاعب وطلع منه دراسة حالة.', 'إذا الهدف كان تخريب كل لعبة دخل فيها، فالمهمة نجحت بنسبة 100%.',
  'الأرقام عم تقول حمار، ونحن ما منقدر نعارض العلم.', 'مو كل واحد بمسك شدة لازم يكمل، أحياناً الاعتزال بطولة.', 'أسبوع كامل وهو عم يثبت إن القاع فيه قبو.',
  'كل قعدة دخلها ترك فيها مصيبة وبصمته الخاصة.', 'شو هالخرا المنظم يا زلمة؟', 'كل رقم بالصفحة عم يسبك لحالو.', 'الأرقام مو سيئة... الأرقام منكوبة.',
  'الأسبوع خلص، بس ريحة المصايب لساتها موجودة.', 'حتى الحمار الحقيقي ممكن يرفع دعوى تشويه سمعة.', 'لو في VAR للشدة كانوا لغوا مشاركتك.', 'الورق ما ظلمك، انت اللي عامل حالك مشروع كارثة.'
];
const subtitles = ['بكل جدارة ومن دون أي ضغط خارجي.', 'بعد مراجعة المصايب، القرار كان واضح.', 'الأرقام ما بتكذب... بس يا ريت كانت كذبت.', 'اللجنة اجتمعت، وضحكت، ووقّعت.', 'الفوز بالبطاقة كان محسوم من نص الأسبوع.'];

function deterministicIndex(seed: string, length: number) { let hash = 2166136261; for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return Math.abs(hash) % length; }
export const buildWeeklyRoast = (weekKey: string, playerId: string) => roasts[deterministicIndex(`${weekKey}:${playerId}:roast`, roasts.length)];
export const buildWeeklySubtitle = (weekKey: string, playerId: string) => subtitles[deterministicIndex(`${weekKey}:${playerId}:subtitle`, subtitles.length)];
