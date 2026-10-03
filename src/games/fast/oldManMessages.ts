import type { MessageEvent, MessageRule } from '../../types';

export type OldManFactoryCategory = NonNullable<MessageRule['oldManCategory']>;
type Frame = { template: string; intensity: 1 | 2 | 3 | 4 };
type Blueprint = {
  category: OldManFactoryCategory;
  count: number;
  event: MessageEvent;
  doubled?: boolean;
  minOccurrences?: number;
  historicalRecord?: boolean;
  priority: number;
  durationMs: number;
  frames: Frame[];
  facts: string[];
};

const normalFrames: Frame[] = [
  { template: '{fact}', intensity: 1 }, { template: 'عاجل من قلب القعدة: {fact}', intensity: 1 },
  { template: 'المحضر الرسمي كتبها بلا رتوش: {fact}', intensity: 2 }, { template: 'المعلّق شهق وقال: {fact}', intensity: 2 },
  { template: 'تقرير الصيانة بعد فحص اللعب: {fact}', intensity: 3 }, { template: 'نشرة الطيز المسائية أعلنت: {fact}', intensity: 3 },
  { template: 'بعد مراجعة الإعادة البطيئة ثبت أن {fact}', intensity: 3 }, { template: 'يا جماعة بلا فلسفة، {fact}', intensity: 4 },
  { template: 'التشخيص النهائي لهالمصيبة: {fact}', intensity: 4 }, { template: 'كس هالحظ، الكاميرا وثقت أن {fact}', intensity: 4 }
];
const roleFrames = normalFrames.slice(0, 8);
const shortFrames = normalFrames.slice(0, 6);
const historicalFrames = [normalFrames[1], normalFrames[2], normalFrames[7], normalFrames[9]];

const blueprints: Blueprint[] = [
  {
    category: 'normal', count: 50, event: 'old-man', priority: 50, durationMs: 5200, frames: normalFrames,
    facts: [
      '{player} بلع الختيار وفتح بطيزو شباك خدمة سريع.', 'الختيار شاف {player} وقال: هاد الإيري بعرفو، فوتوني.',
      'طيز {player} اشتغلت GPS والختيار وصل بلا ما يسأل حدا.', '{player} ما أكل الختيار؛ الختيار اختار يسكن عنده بالإيجار.',
      'اللعب عند {player} صار بوفيه، والختيار أول واحد عالدور.'
    ]
  },
  {
    category: 'doubled', count: 50, event: 'old-man', doubled: true, priority: 60, durationMs: 7600, frames: normalFrames,
    facts: [
      '{player} أكل الختيار مدبل؛ إير واحد ما عاد مكفي هالمصيبة.', 'الختيار المدبل فات بطيز {player} وهو حامل بطاقة VIP.',
      'التدبيل حوّل غلطة {player} من خرا عادي لمهرجان خرا رسمي.', '{player} جمع الختيار والتدبيل والفضيحة بضربة وحدة مرتبة.',
      'الختيار وصل مدبل، وطيز {player} فتحتله مسربين بدل واحد.'
    ]
  },
  {
    category: 'owner', count: 40, event: 'old-man-owner', doubled: false, priority: 50, durationMs: 5600, frames: roleFrames,
    facts: [
      'الملك {owner} أكل الختيار بمملكته وصار التاج غطا طنجرة.', '{owner} فتح المملكة للختيار وبعدين بلعه متل الحمار.',
      'صاحب المملكة خرّب عرشه بإيده وحط الختيار بطيزو ختم ملكي.', 'التاج فوق راس {owner} والختيار تحتو عامل اعتصام.',
      '{owner} سمّى المملكة باسمه وبآخرها أكل الختيار كأنه الإنجاز الرسمي.'
    ]
  },
  {
    category: 'owner-doubled', count: 50, event: 'old-man-owner', doubled: true, priority: 60, durationMs: 10000, frames: normalFrames,
    facts: [
      '{owner} أكل الختيار مدبل بمملكته؛ الملك صار خازوق متحرك.', 'التاج وقع من هول المنظر والختيار المدبل ظل ثابت بطيز {owner}.',
      'مملكة {owner} أعلنت الإفلاس بعد ما بلع الختيار مدبل وابتسم.', 'صاحب العرش دبّل الخرا على حاله ووقّع الاستلام باسم {owner}.',
      '{owner} عمل من مملكته موقف مجاني للختيار المدبل، يا إير هالإدارة.'
    ]
  },
  {
    category: 'partner', count: 30, event: 'old-man-partner', priority: 50, durationMs: 5400, frames: shortFrames,
    facts: [
      '{player} أكل الختيار وترك {owner} يشيل خرا الشراكة لحاله.', 'شريك الملك بلع الختيار وصار الفريق شركة مساهمة بالفضيحة.',
      '{owner} لعب ملك، و{player} لعب فتحة تصريف للختيار.', 'الشريك قرر يساعد المملكة فحط الختيار بطيزو بدل النقاط.',
      'عقد الشراكة مع {player} صار بحاجة بند يمنع أكل الختيار.'
    ]
  },
  {
    category: 'opponent', count: 30, event: 'old-man-opponent', priority: 50, durationMs: 5200, frames: shortFrames,
    facts: [
      '{player} من الخصم أكل الختيار، وفريق {team} شمّ الهوا النظيف شوي.', 'الختيار عبر للخصم وصفّ بطيز {player} كأنه حاجز مكان.',
      'المصيبة نزلت عند {opponentTeam} و{player} وقّع الاستلام.', 'الخصم بلع الختيار، وصاحب المملكة قال: خليه يلحس هالمرة بعيد.',
      '{player} فتح بوفيه بالجهة الثانية والختيار وصل أول زبون.'
    ]
  },
  {
    category: 'repeat', count: 40, event: 'old-man', minOccurrences: 2, priority: 80, durationMs: 6200, frames: roleFrames,
    facts: [
      '{player} أكل الختيار للمرة {oldManCount}؛ طيزو صارت فرع دائم.', 'رجع الختيار لعند {player} للمرة {oldManCount} لأنه حافظ المدخل.',
      'المرة {oldManCount} وما زال {player} يمثل دور المتفاجئ، يا خرا الذكاء.', '{player} عم يجمع ختايرة كأنه آخر القعدة في جائزة عالغباء.',
      'الختيار و{player} صاروا ثنائي القعدة؛ واحد بيفوت والثاني ما بيتعلم.'
    ]
  },
  {
    category: 'repeat-doubled', count: 40, event: 'old-man', doubled: true, minOccurrences: 2, priority: 90, durationMs: 9000, frames: roleFrames,
    facts: [
      '{player} كرر الختيار المدبل للمرة {oldManCount}؛ هاد مو حظ، هاد اشتراك بريميوم.', 'المدبل رجع لطيز {player} وكأنه ناسي شاحنته جوّا.',
      'اختيار مدبل مرة ثانية؛ {player} عم يبني ناطحة خرا طابق فوق طابق.', 'التدبيل تكرر ونفس الإيري استلمه، ثبات يستحق شهادة فشل.',
      '{player} كل ما يشوف الختيار مدبل بيفتحله ويقول تفضل محلك محفوظ.'
    ]
  },
  {
    category: 'magnet', count: 40, event: 'old-man', minOccurrences: 3, priority: 100, durationMs: 7600, frames: roleFrames,
    facts: [
      '{player} صار مغناطيس اختيار رسمي؛ العدد وصل {oldManCount} والطيز بعدها فاتحة.', 'أي اختيار يضيع بالقعدة اسألوا عنه عند {player}.',
      'العداد وصل {oldManCount}؛ بدنا نغير اسم {player} لموقف الختيار المركزي.', 'الختيار ما عاد يلف عالطاولة، بيطلع مباشرة لعند {player}.',
      '{player} احتكر سوق الختيار وخلى الباقي بلا مصايب.'
    ]
  },
  {
    category: 'historical', count: 20, event: 'old-man', historicalRecord: true, priority: 110, durationMs: 8200, frames: historicalFrames,
    facts: [
      '{player} دخل الأرشيف من أوسخ أبوابه: {oldManCount} ختايرة بقعدة واحدة.', 'سجل الختيار التاريخي انكسر على طيز {player} وبقيت الشظايا جوّا.',
      'الرقم القياسي صار باسم {player}؛ حتى العداد قال كس هالموهبة.', 'القعدة سجلت كارثة تاريخية والختيار وقّعها فوق لعب {player}.',
      '{player} ساوى أسوأ رقم معروف، وكأنه الفشل بطولة لازم يدافع عنها.'
    ]
  }
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
