import type { GamePlayer, GameSession, MessageRule } from '../../types';
import { partnerForPlayer } from './scoring';

type TemplateValues = Partial<Record<'owner' | 'player' | 'partner' | 'score' | 'absScore' | 'team' | 'target', string | number>>;
type MessageContext = { game: GameSession; owner: GamePlayer; ownerScore?: number; partnerScore?: number; eaterPlayerId?: string; doubled?: boolean; target?: number };

const now = '2026-10-01T00:00:00.000Z';
const lashBands: Array<[string, number | undefined, number | undefined, string]> = [
  ['positive', 1, undefined, 'حجي قوم مد الغالي بالقعدة خلي الشباب تاخد الرضا'],
  ['0-to-50', -50, 0, 'عاااااش يا وحش الـ{absScore} ولا شي'],
  ['51-to-100', -100, -51, 'حلوة ودليل على فهم {owner}'],
  ['101-to-200', -200, -101, 'لا بأس حجي لا بأس مقبولة نوعاً ما'],
  ['201-to-249', -249, -201, 'شو الترتيب يابا شو هالنتيجة الخرا'],
  ['exact-250', -250, -250, 'يلا انقسمت بيناتنا'],
  ['251-to-300', -300, -251, 'شو هاد حمار سبحان مين حجبك عن أكل التبن'],
  ['301-to-350', -350, -301, 'خراي عليك وعالشدة وعاللي مسكك ورق شدة وقلك بتفهم تلعب'],
  ['351-to-400', -400, -351, 'قوم ع بيتكن ايري فيك وباللي اتصل فيك وعزمك عالقعدة يلا حجي يلا ع بيتكن'],
  ['401-to-450', -450, -401, 'شوووووو هاللعب المأير هاد ع شوي رح توصل لمستوى منذر طبانة بالبهم'],
  ['451-to-499', -499, -451, 'اووووووووووووه لعب كلاب هاد مو لعب بني آدمين ...شو يا {owner} مو حاسس حالك حمار ...تريك ورق هالشدة وقوم شوف مستقبلك بغير مكان'],
  ['500-or-less', undefined, -500, 'يا جماعة واضحة ......خلونا نقوم نعمل فرشاية لـ {owner} .....طيزو محجوزة لأبو عمر شفلك مكان تاني وغزو منو']
];

const trixMatrix: Array<[number, number, string]> = [
  [200, 150, 'جوني سنس وشريكو'], [200, 100, 'لعب معلمين هاد'], [200, 50, 'يلا شي بعوض شي'],
  [150, 200, 'جوني سنس وشريكو'], [150, 100, 'يلا مقبولة'], [150, 50, 'كس اخت هالتسماية'],
  [100, 200, 'ولله يا {owner} شريكك أفهم منك'], [100, 150, 'يلا مقبولة'], [100, 50, 'ورق خرا وشراكة ع أخرا'],
  [50, 200, 'معلم {partner} الله يعينك على هالحمار'], [50, 150, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة'], [50, 100, 'شو هالحمير اللي عم تلعب هي قوموا خرايي عليكن وعالشدة']
];

export function factoryMessageRules(): MessageRule[] {
  const rules: MessageRule[] = lashBands.flatMap(([id, minScore, maxScore, template]) => (['fast-lash', 'cc-lash'] as const).map((category) => ({ id: `${category}-${id}`, factoryId: `${category}-${id}`, category, gameTypes: category === 'fast-lash' ? ['trix-fast'] : ['cc'], event: 'lash-owner-score', minScore, maxScore, template, durationMs: 5000, enabled: true, priority: 20, createdAt: now, updatedAt: now })));
  rules.push(...trixMatrix.map(([ownerScore, partnerScore, template]): MessageRule => ({ id: `fast-trix-${ownerScore}-${partnerScore}`, factoryId: `fast-trix-${ownerScore}-${partnerScore}`, category: 'fast-trix', gameTypes: ['trix-fast'], event: 'trix-partnership', ownerScore, partnerScore, template, durationMs: 5000, enabled: true, priority: 30, createdAt: now, updatedAt: now })));
  rules.push(
    { id: 'old-man-owner-normal', factoryId: 'old-man-owner-normal', category: 'old-man', gameTypes: ['trix-fast', 'cc'], event: 'old-man-owner', doubled: false, template: 'ملط الختيار ملط يلحس ايري', durationMs: 5000, enabled: true, priority: 80, createdAt: now, updatedAt: now },
    { id: 'old-man-owner-doubled', factoryId: 'old-man-owner-doubled', category: 'old-man', gameTypes: ['trix-fast', 'cc'], event: 'old-man-owner', doubled: true, template: 'ولد راح لعند أبوه وقلو ...بابا ناكوني بالحارة ....قلو الأب أسهل ما تاكل الختيار مدبل بمملكتك متل هالحمار {owner}', durationMs: 10000, enabled: true, priority: 100, createdAt: now, updatedAt: now }
  );
  ['انكسر الاير', 'كس اخت هالقعدة ولو', 'انكسر الحمار ريتو يلحس طيز أبو منير', 'أبو ربيع ما اشتغل هالشغل الايري', 'أبو أسامة اللي قلك تلعب هاللعب ؟؟!'].forEach((template, index) => rules.push({ id: `tarneeb-break-private-${index}`, factoryId: `tarneeb-break-private-${index}`, category: 'tarneeb-break', gameTypes: ['tarneeb-61'], event: 'tarneeb-break', template, durationMs: 5000, enabled: true, priority: 10, createdAt: now, updatedAt: now }));
  return rules;
}

export function interpolateTemplate(template: string, values: TemplateValues): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: keyof TemplateValues) => values[key] === undefined ? match : String(values[key]));
}

export function matchingMessages(rules: MessageRule[], context: MessageContext, event: MessageRule['event']): MessageRule[] {
  return rules.filter((rule) => rule.enabled && rule.event === event && rule.gameTypes.includes(context.game.gameType) &&
    (rule.minScore === undefined || (context.ownerScore ?? 0) >= rule.minScore) && (rule.maxScore === undefined || (context.ownerScore ?? 0) <= rule.maxScore) &&
    (rule.ownerScore === undefined || rule.ownerScore === context.ownerScore) && (rule.partnerScore === undefined || rule.partnerScore === context.partnerScore) &&
    (rule.doubled === undefined || rule.doubled === context.doubled));
}

export function renderMessage(rule: MessageRule, context: MessageContext): string {
  const partnerId = partnerForPlayer(context.owner.id, context.game.teams);
  return interpolateTemplate(rule.template, { owner: context.owner.name, player: context.game.players.find((player) => player.id === context.eaterPlayerId)?.name, partner: context.game.players.find((player) => player.id === partnerId)?.name, score: context.ownerScore, absScore: Math.abs(context.ownerScore ?? 0), team: context.game.teams?.find((team) => team.playerIds.includes(context.owner.id))?.name, target: context.target });
}

export function pickMessage(rules: MessageRule[], previousId?: string, random: () => number = Math.random): MessageRule | undefined {
  const pool = rules.length > 1 ? rules.filter((rule) => rule.id !== previousId) : rules;
  return pool[Math.floor(random() * pool.length)];
}
