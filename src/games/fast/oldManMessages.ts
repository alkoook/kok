import type { MessageEvent, MessageRule } from '../../types';

export type OldManFactoryCategory = NonNullable<MessageRule['oldManCategory']>;
type Frame = { template: string; intensity: 1 | 2 | 3 | 4 };
type Blueprint = { category: OldManFactoryCategory; count: number; event: MessageEvent; doubled?: boolean; minOccurrences?: number; historicalRecord?: boolean; priority: number; durationMs: number; frames: Frame[]; facts: string[] };

const normalFrames: Frame[] = [
  { template: '{fact}', intensity: 1 }, { template: 'عاجل من قلب القعدة: {fact}', intensity: 1 },
  { template: 'المحضر الرسمي كتبها بلا رتوش: {fact}', intensity: 2 }, { template: 'المعلّق توقف وقال: {fact}', intensity: 2 },
  { template: 'تقرير الجولة بعد مراجعة اللعب: {fact}', intensity: 3 }, { template: 'النشرة المسائية أعلنت: {fact}', intensity: 3 },
  { template: 'بعد مراجعة الإعادة البطيئة ثبت أن {fact}', intensity: 3 }, { template: 'يا جماعة بلا فلسفة، {fact}', intensity: 4 },
  { template: 'التشخيص النهائي لهذه الجولة: {fact}', intensity: 4 }, { template: 'الكاميرا وثقت أن {fact}', intensity: 4 }
];
const roleFrames = normalFrames.slice(0, 8);
const shortFrames = normalFrames.slice(0, 6);
const historicalFrames = [normalFrames[1], normalFrames[2], normalFrames[7], normalFrames[9]];

const blueprints: Blueprint[] = [
  { category: 'normal', count: 50, event: 'old-man', priority: 50, durationMs: 5200, frames: normalFrames, facts: [
    '{player} أخذ الختيار وفتح له مكاناً دائماً في سجله.', 'الختيار رأى {player} وقرر أن هذه وجهته.',
    'عداد {player} استقبل الختيار بلا أي تأخير.', '{player} لم يبحث عن الختيار؛ الختيار هو الذي وجده.',
    'اللعب عند {player} صار محطة، والختيار أول الواصلين.'
  ] },
  { category: 'doubled', count: 50, event: 'old-man', doubled: true, priority: 60, durationMs: 7600, frames: normalFrames, facts: [
    '{player} أكل الختيار مدبلاً؛ ضربة واحدة لم تعد كافية.', 'الختيار المدبل وصل إلى {player} ببطاقة أولوية.',
    'التدبيل حوّل غلطة {player} إلى حدث الجولة.', '{player} جمع الختيار والتدبيل في لقطة واحدة ثقيلة.',
    'الختيار وصل مدبلاً، ونتيجة {player} فتحت مسارين للسالب.'
  ] },
  { category: 'owner', count: 40, event: 'old-man-owner', doubled: false, priority: 50, durationMs: 5600, frames: roleFrames, facts: [
    'الملك {owner} أكل الختيار في مملكته وصار التاج بحاجة مراجعة.', '{owner} فتح المملكة للختيار ثم سجله باسمه.',
    'صاحب المملكة أثقل عرشه بالختيار وختم الجولة باسمه.', 'التاج فوق رأس {owner} والختيار حاضر في النتيجة.',
    '{owner} سمّى المملكة باسمه وفي نهايتها أخذ الختيار أيضاً.'
  ] },
  { category: 'owner-doubled', count: 50, event: 'old-man-owner', doubled: true, priority: 60, durationMs: 10000, frames: normalFrames, facts: [
    '{owner} أكل الختيار مدبلاً في مملكته؛ العرش اهتز.', 'التاج توقف لحظة والختيار المدبل بقي في رصيد {owner}.',
    'مملكة {owner} أعلنت حالة طوارئ بعد الختيار المدبل.', 'صاحب العرش ضاعف الأثر على نفسه وسجل الاستلام باسم {owner}.',
    '{owner} خصص مكاناً للختيار المدبل في سجل المملكة.'
  ] },
  { category: 'partner', count: 30, event: 'old-man-partner', priority: 50, durationMs: 5400, frames: shortFrames, facts: [
    '{player} أكل الختيار وترك {owner} يشارك أثر النتيجة.', 'شريك الملك أخذ الختيار وصار الفريق شريكاً في الحساب.',
    '{owner} لعب دور الملك، و{player} سجل الختيار على الفريق.', 'الشريك قرر المساعدة لكن الختيار وصل إلى رصيده.',
    'عقد الشراكة مع {player} صار بحاجة بند خاص بالختيار.'
  ] },
  { category: 'opponent', count: 30, event: 'old-man-opponent', priority: 50, durationMs: 5200, frames: shortFrames, facts: [
    '{player} من الخصم أكل الختيار، وفريق {team} أخذ نفساً.', 'الختيار عبر للخصم وتوقف عند {player}.',
    'الضربة نزلت عند {opponentTeam} و{player} سجل الاستلام.', 'الخصم أخذ الختيار، وصاحب المملكة بقي بعيداً هذه المرة.',
    '{player} فتح الطريق في الجهة الثانية والختيار وصل أولاً.'
  ] },
  { category: 'repeat', count: 40, event: 'old-man', minOccurrences: 2, priority: 80, durationMs: 6200, frames: roleFrames, facts: [
    '{player} أكل الختيار للمرة {oldManCount}؛ صار الحدث متكرراً.', 'رجع الختيار إلى {player} للمرة {oldManCount} لأنه حفظ الطريق.',
    'المرة {oldManCount} وما زال {player} يتعامل معها كأنها الأولى.', '{player} يجمع الختايرة والعداد مستمر.',
    'الختيار و{player} صارا ثنائي القعدة؛ زيارة وراء زيارة.'
  ] },
  { category: 'repeat-doubled', count: 40, event: 'old-man', doubled: true, minOccurrences: 2, priority: 90, durationMs: 9000, frames: roleFrames, facts: [
    '{player} كرر الختيار المدبل للمرة {oldManCount}؛ هذا صار اشتراكاً متكرراً.', 'المدبل رجع إلى {player} وكأنه ترك شيئاً عنده.',
    'ختيار مدبل مرة ثانية؛ {player} يبني رقماً فوق رقم.', 'التدبيل تكرر ونفس اللاعب استلمه؛ ثبات غير مرغوب.',
    '{player} كلما رأى الختيار مدبلاً وجده في رصيده.'
  ] },
  { category: 'magnet', count: 40, event: 'old-man', minOccurrences: 3, priority: 100, durationMs: 7600, frames: roleFrames, facts: [
    '{player} صار مغناطيس اختيار رسمي؛ العدد وصل {oldManCount}.', 'أي اختيار يضيع في القعدة اسألوا عنه عند {player}.',
    'العداد وصل {oldManCount}؛ اسم {player} صار مرتبطاً بالختيار.', 'الختيار لم يعد يلف على الطاولة؛ يتجه مباشرة إلى {player}.',
    '{player} احتكر سجل الختيار وترك الباقي بعيدين.'
  ] },
  { category: 'historical', count: 20, event: 'old-man', historicalRecord: true, priority: 110, durationMs: 8200, frames: historicalFrames, facts: [
    '{player} دخل الأرشيف: {oldManCount} ختايرة في قعدة واحدة.', 'سجل الختيار التاريخي انكسر باسم {player}.',
    'الرقم القياسي صار باسم {player}؛ حتى العداد طلب التأكد.', 'القعدة سجلت حدثاً تاريخياً والختيار وقّعه باسم {player}.',
    '{player} ساوى أسوأ رقم معروف، وصار الرقم بحاجة دفاع في القعدة القادمة.'
  ] }
];

function compileBlueprint(blueprint: Blueprint): MessageRule[] {
  const timestamp = '2026-10-03T00:00:00.000Z';
  const templates = blueprint.frames.flatMap((frame) => blueprint.facts.map((fact) => ({ template: frame.template.replace('{fact}', fact), intensity: frame.intensity }))).slice(0, blueprint.count);
  return templates.map(({ template, intensity }, index) => ({
    id: `old-man-v2-${blueprint.category}-${index + 1}`, factoryId: `old-man-v2-${blueprint.category}-${index + 1}`, alternativeGroupId: `old-man-v2-${blueprint.category}`,
    category: 'old-man', oldManCategory: blueprint.category, gameTypes: ['trix-fast', 'cc'], event: blueprint.event,
    doubled: blueprint.doubled, minOccurrences: blueprint.minOccurrences, historicalRecord: blueprint.historicalRecord,
    template, durationMs: blueprint.durationMs, enabled: true, priority: blueprint.priority, intensity, createdAt: timestamp, updatedAt: timestamp
  }));
}

export const OLD_MAN_FACTORY_RULES: MessageRule[] = blueprints.flatMap(compileBlueprint);
export const OLD_MAN_FACTORY_COUNTS = Object.fromEntries(blueprints.map((blueprint) => [blueprint.category, blueprint.count])) as Record<OldManFactoryCategory, number>;
