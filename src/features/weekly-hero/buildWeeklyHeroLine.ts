const heroLines = [
  'الأسبوع هاد الطاولة كانت باسمه.',
  'لعب وضمن وحسم، وترك الباقي يتنافسون على المركز الثاني.',
  'الأرقام قالت بطل قبل ما نحنا نحكي.',
  'ما ترك كتير مجال للنقاش... الملك معروف.',
  'هالأسبوع كان داخل يربي مو يلعب.',
  'كل قعدة دخلها كان تارك بصمته فيها.',
  'رفع السقف وخلى الباقي يلحقوا.',
  'أسبوع ملكي، والباقي كانوا كومبارس.',
  'الحكي خلص... الأرقام صفقتله.',
  'هالمرة اللقب مو مجاملة، الزلمة أكل الأخضر واليابس.'
];

function deterministicIndex(seed: string, length: number) {
  let hash = 2166136261;
  for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return Math.abs(hash) % length;
}

export const buildWeeklyHeroLine = (weekKey: string, playerId: string) => heroLines[deterministicIndex(`${weekKey}:${playerId}:hero`, heroLines.length)];
