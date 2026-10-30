import type { GamePlayer, GameSession, MessageRule } from '../../types';
import { TARNEEB_FAILURE_MESSAGES, TARNEEB_PRIVATE_FAILURE_MESSAGES, TARNEEB_SUCCESS_MESSAGES, brokenSevenMessage, kabootMessage } from '../tarneeb/reactions';
import { partnerForPlayer, teamForPlayer } from './scoring';
import { OLD_MAN_FACTORY_RULES } from './oldManMessages';

export type TemplateValues = Partial<Record<'owner' | 'player' | 'partner' | 'score' | 'absScore' | 'team' | 'opponent' | 'opponentTeam' | 'margin' | 'kingdom' | 'target' | 'winner' | 'loser' | 'count' | 'position' | 'bid' | 'actualTricks' | 'remaining' | 'fourthCount' | 'oldManCount' | 'doubledCount' | 'leadChanges' | 'kingdomWins' | 'ownerBehindPartner' | 'largestSwing' | 'averagePlacement' | 'bestLash', string | number>>;
export type MessageContext = { game: GameSession; owner: GamePlayer; ownerScore?: number; partnerScore?: number; eaterPlayerId?: string; doubled?: boolean; occurrences?: number; target?: number; intensity?: 1 | 2 | 3 | 4; historicalRecord?: boolean };

const now = '2026-10-01T00:00:00.000Z';
type LashBand = { id: string; minScore?: number; maxScore?: number; partnership: string; solo: string };
export const LASH_BANDS: LashBand[] = [
  { id: 'positive', minScore: 1, partnership: 'نتيجة ممتازة لـ{owner}.', solo: 'نتيجة ممتازة لـ{owner}.' },
  { id: '0-to-50', minScore: -50, maxScore: 0, partnership: 'جولة نظيفة؛ سالب {absScore} فقط.', solo: 'جولة نظيفة؛ سالب {absScore} فقط.' },
  { id: '51-to-100', minScore: -100, maxScore: -51, partnership: 'نتيجة جيدة ومضبوطة.', solo: 'نتيجة جيدة ومضبوطة.' },
  { id: '101-to-200', minScore: -200, maxScore: -101, partnership: 'نتيجة مقبولة مع مجال للتحسن.', solo: 'نتيجة مقبولة مع مجال للتحسن.' },
  { id: '201-to-249', minScore: -249, maxScore: -201, partnership: 'الجولة كانت ثقيلة قليلاً.', solo: 'الجولة كانت ثقيلة قليلاً.' },
  { id: 'exact-250', minScore: -250, maxScore: -250, partnership: 'نصف مجموع اللطش تماماً.', solo: 'نصف مجموع اللطش تماماً.' },
  { id: '251-to-300', minScore: -300, maxScore: -251, partnership: 'نتيجة تستحق المراجعة.', solo: 'نتيجة تستحق المراجعة.' },
  { id: '301-to-350', minScore: -350, maxScore: -301, partnership: 'تعثر واضح في هذه الجولة.', solo: 'تعثر واضح في هذه الجولة.' },
  { id: '351-to-400', minScore: -400, maxScore: -351, partnership: 'جولة صعبة وتحتاج تعويضاً.', solo: 'جولة صعبة وتحتاج تعويضاً.' },
  { id: '401-to-450', minScore: -450, maxScore: -401, partnership: 'من أكبر تعثرات القعدة.', solo: 'من أكبر تعثرات القعدة.' },
  { id: '451-to-499', minScore: -499, maxScore: -451, partnership: 'الجولة لم تكن موفقة أبداً.', solo: 'الجولة لم تكن موفقة أبداً.' },
  { id: '500-or-less', maxScore: -500, partnership: 'النتيجة الكاملة ذهبت إلى هذا الطرف.', solo: 'النتيجة الكاملة ذهبت إلى هذا اللاعب.' }
];

const trixDefaults: Array<[number, number, string]> = [
  [200, 150, 'شراكة ممتازة ونتيجة قوية.'], [200, 100, 'تركس مرتب من صاحب المملكة.'], [200, 50, 'نتيجة متوازنة بين الشريكين.'],
  [150, 200, 'الشريك حسم ترتيب التركس.'], [150, 100, 'نتيجة مقبولة للفريق.'], [150, 50, 'فارق واضح بين الشريكين.'],
  [100, 200, '{partner} قدّم المساهمة الأكبر.'], [100, 150, 'تقاسم جيد للنقاط.'], [100, 50, 'الشراكة تحتاج تنسيقاً أفضل.'],
  [50, 200, '{partner} أنقذ نتيجة الفريق.'], [50, 150, 'صاحب المملكة حلّ أخيراً.'], [50, 100, 'ترتيب يحتاج مراجعة قبل المملكة التالية.']
];

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
  factoryCache ??= [...createLashRules(), ...createTrixRules(), ...OLD_MAN_FACTORY_RULES, ...createTarneebRules()];
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
  return rules.filter((rule) => rule.enabled && (rule.event === event || rule.event === 'old-man' && event.startsWith('old-man-')) && rule.gameTypes.includes(context.game.gameType) && (!rule.trixMode || rule.trixMode === context.game.trixMode) && (rule.intensity ?? 1) <= intensity &&
    (rule.minScore === undefined || (context.ownerScore ?? 0) >= rule.minScore) && (rule.maxScore === undefined || (context.ownerScore ?? 0) <= rule.maxScore) &&
    (rule.ownerScore === undefined || rule.ownerScore === context.ownerScore) && (rule.partnerScore === undefined || rule.partnerScore === context.partnerScore) &&
    (rule.doubled === undefined || rule.doubled === context.doubled) && (rule.minOccurrences === undefined || (context.occurrences ?? 0) >= rule.minOccurrences) &&
    (rule.historicalRecord === undefined || rule.historicalRecord === context.historicalRecord));
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
    count: context.occurrences,
    oldManCount: context.occurrences,
    kingdom: context.game.players.findIndex((player) => player.id === context.owner.id) + 1
  });
}

export function normalizeReactionSkeleton(template: string): string {
  return template.toLocaleLowerCase('ar').replace(/\{[a-zA-Z]+\}/g, '{value}').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/[^\p{L}\p{N}{}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

export function pickMessage(rules: MessageRule[], previous?: string | string[], random: () => number = Math.random, previousSkeletons: string[] = []): MessageRule | undefined {
  if (!rules.length) return undefined;
  const excluded = new Set(Array.isArray(previous) ? previous : previous ? [previous] : []);
  const maxPriority = Math.max(...rules.map((rule) => rule.priority));
  const prioritized = rules.filter((rule) => rule.priority === maxPriority);
  const skeletons = new Set(previousSkeletons);
  const available = prioritized.filter((rule) => !excluded.has(rule.id) && !skeletons.has(normalizeReactionSkeleton(rule.template)));
  const pool = available.length ? available : prioritized.filter((rule) => !excluded.has(rule.id)).length ? prioritized.filter((rule) => !excluded.has(rule.id)) : prioritized;
  return pool[Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))];
}

const MESSAGE_HISTORY_KEY = 'kok-recent-message-ids';
const MESSAGE_SKELETON_HISTORY_KEY = 'kok-recent-message-skeletons';
export function readRecentMessageIds(): string[] {
  try { const parsed = JSON.parse(localStorage.getItem(MESSAGE_HISTORY_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string').slice(-20) : []; } catch { return []; }
}
export function readRecentMessageSkeletons(): string[] {
  try { const parsed = JSON.parse(localStorage.getItem(MESSAGE_SKELETON_HISTORY_KEY) ?? '[]'); return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string').slice(-20) : []; } catch { return []; }
}
export function rememberMessageId(id: string, template?: string): void {
  const recent = readRecentMessageIds().filter((item) => item !== id);
  recent.push(id);
  localStorage.setItem(MESSAGE_HISTORY_KEY, JSON.stringify(recent.slice(-20)));
  if (template) {
    const skeleton = normalizeReactionSkeleton(template);
    const skeletons = readRecentMessageSkeletons().filter((item) => item !== skeleton);
    skeletons.push(skeleton);
    localStorage.setItem(MESSAGE_SKELETON_HISTORY_KEY, JSON.stringify(skeletons.slice(-20)));
  }
}
