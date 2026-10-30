const roasts = [
  'كان صاحب أكبر عدد من التعثرات هذا الأسبوع.', 'الأرقام لم تكن في صفه هذه المرة.', 'دخل أكثر من قعدة وخرج بنتائج تحتاج مراجعة.',
  'اللقب مبني على النتائج المسجلة فقط.', 'أسبوع صعب، وفرصة التعويض تبدأ من القعدة القادمة.', 'تكررت التعثرات حتى حسمت البطاقة.',
  'كل قعدة أضافت سبباً جديداً للنتيجة.', 'النتائج اجتمعت على قرار واحد.', 'الأرقام واضحة ولا تحتاج مبالغة.', 'لم يكن أسبوعه الأفضل.',
  'انتهى الأسبوع وبقيت الدروس المسجلة.', 'الفارق صنعته مجموعة من القرارات غير الموفقة.', 'المراجعة الهادئة قد تغيّر الأسبوع القادم.', 'الورق لم يساعد، وبعض القرارات زادت الصعوبة.'
];
const subtitles = ['بناءً على نتائج الأسبوع.', 'بعد مراجعة التعثرات، القرار كان واضحاً.', 'الأرقام حسمت الاختيار هذه المرة.', 'النتائج اجتمعت وأعطت حكماً واضحاً.', 'البطاقة حُسمت من منتصف الأسبوع.'];

function deterministicIndex(seed: string, length: number) { let hash = 2166136261; for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return Math.abs(hash) % length; }
export const buildWeeklyRoast = (weekKey: string, playerId: string) => roasts[deterministicIndex(`${weekKey}:${playerId}:roast`, roasts.length)];
export const buildWeeklySubtitle = (weekKey: string, playerId: string) => subtitles[deterministicIndex(`${weekKey}:${playerId}:subtitle`, subtitles.length)];
