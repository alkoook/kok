import type {
  ConditionalField,
  ConditionalMessageAlternative,
  ConditionalOperator,
  ConditionalReactionRule,
  ConditionalRuleCondition,
  ConditionalRuleEvent,
  ConditionalRuleFiring,
  ConditionalRuleGame,
  ConditionalValue
} from '../../types';

export type ConditionalFieldKind = 'number' | 'boolean' | 'select' | 'player';
export type ConditionalFieldDefinition = { id: ConditionalField; label: string; kind: ConditionalFieldKind; options?: Array<{ value: string | boolean; label: string }> };
export type ConditionalReactionContext = {
  gameId: string;
  game: ConditionalRuleGame;
  event: ConditionalRuleEvent;
  roundIndex: number;
  intensity: 1 | 2 | 3 | 4;
  values: Partial<Record<ConditionalField, ConditionalValue>>;
  placeholders: Partial<Record<string, string | number>>;
  actorProfileId?: string;
  participantProfileIds: string[];
  ownerTeamProfileIds?: string[];
  opponentTeamProfileIds?: string[];
  profilePositions?: Record<string, number>;
};
export type ConditionalReactionSelection = { rule: ConditionalReactionRule; alternative: ConditionalMessageAlternative };

export const CONDITIONAL_GAME_LABELS: Record<ConditionalRuleGame, string> = { 'trix-fast': 'Fast Trix', cc: 'CC', 'tarneeb-61': 'طرنيب' };
export const CONDITIONAL_EVENT_LABELS: Record<ConditionalRuleEvent, string> = { lash: 'لطش', trix: 'تركس', 'old-man': 'الختيار', tarneeb: 'جولة طرنيب' };
export const CONDITIONAL_OPERATOR_LABELS: Record<ConditionalOperator, string> = { eq: 'يساوي', neq: 'لا يساوي', gt: 'أكبر من', gte: 'أكبر أو يساوي', lt: 'أقل من', lte: 'أقل أو يساوي', between: 'بين' };

const modeOptions = [{ value: 'partnership', label: 'شراكة' }, { value: 'solo', label: 'يهودية' }];
const roleOptions = [{ value: 'owner', label: 'صاحب المملكة' }, { value: 'partner', label: 'الشريك' }, { value: 'opponent', label: 'الخصم' }];
const commonFast: ConditionalFieldDefinition[] = [
  { id: 'gameMode', label: 'طريقة اللعب', kind: 'select', options: modeOptions },
  { id: 'kingdomNumber', label: 'رقم المملكة', kind: 'number' },
  { id: 'ownerProfileId', label: 'صاحب المملكة الدائم', kind: 'player' },
  { id: 'ownerTeamProfileId', label: 'فريق المالك يحتوي اللاعب', kind: 'player' },
  { id: 'opponentTeamProfileId', label: 'الفريق الخصم يحتوي اللاعب', kind: 'player' }
];
const streakFields: ConditionalFieldDefinition[] = [
  { id: 'badLashStreak', label: 'لطشات سيئة متتالية (≤ -250)', kind: 'number' },
  { id: 'goodLashStreak', label: 'لطشات جيدة متتالية (> -100)', kind: 'number' }
];
const lashFields: ConditionalFieldDefinition[] = [
  { id: 'enteredTeamScore', label: 'نتيجة الفريق المُدخلة', kind: 'number' },
  { id: 'ownerTeamScore', label: 'نتيجة فريق صاحب المملكة', kind: 'number' },
  { id: 'opponentTeamScore', label: 'نتيجة الفريق الخصم', kind: 'number' },
  { id: 'soloPlayerScore', label: 'نتيجة صاحب المملكة الفردية', kind: 'number' },
  ...streakFields
];
const trixFields: ConditionalFieldDefinition[] = [
  { id: 'ownerPosition', label: 'مركز صاحب المملكة', kind: 'number' }, { id: 'partnerPosition', label: 'مركز الشريك', kind: 'number' },
  { id: 'targetProfileId', label: 'اللاعب الدائم المستهدف', kind: 'player' }, { id: 'targetPlayerPosition', label: 'مركز اللاعب المستهدف', kind: 'number' },
  { id: 'ownerTrixPoints', label: 'نقاط صاحب المملكة', kind: 'number' }, { id: 'partnerTrixPoints', label: 'نقاط الشريك', kind: 'number' },
  { id: 'teamTrixTotal', label: 'مجموع فريق المالك', kind: 'number' }, { id: 'ownerAheadPartner', label: 'المالك أنهى قبل الشريك', kind: 'boolean' },
  { id: 'partnerAheadOwner', label: 'الشريك أنهى قبل المالك', kind: 'boolean' }, { id: 'ownerFirst', label: 'المالك أول', kind: 'boolean' },
  { id: 'ownerLast', label: 'المالك رابع', kind: 'boolean' }, { id: 'partnerFirst', label: 'الشريك أول', kind: 'boolean' },
  { id: 'partnerLast', label: 'الشريك رابع', kind: 'boolean' }, { id: 'pairCombination', label: 'تركيبة نقاط المالك/الشريك', kind: 'select', options: [200, 150, 100, 50].flatMap((owner) => [200, 150, 100, 50].filter((partner) => partner !== owner).map((partner) => ({ value: `${owner}:${partner}`, label: `${owner} / ${partner}` }))) },
  { id: 'trixFirstStreak', label: 'مراكز أولى متتالية للمالك', kind: 'number' }, { id: 'trixFourthStreak', label: 'مراكز رابعة متتالية للمالك', kind: 'number' }
];
const oldManFields: ConditionalFieldDefinition[] = [
  { id: 'oldManRole', label: 'صفة آكل الختيار', kind: 'select', options: roleOptions }, { id: 'oldManDoubled', label: 'الختيار مدبل', kind: 'boolean' },
  { id: 'ownerAteOldMan', label: 'المالك أكل الختيار', kind: 'boolean' }, { id: 'ownerAteDoubledOldMan', label: 'المالك أكله مدبل', kind: 'boolean' },
  { id: 'playerAteOwnKingdom', label: 'اللاعب أكله بمملكته', kind: 'boolean' }, { id: 'targetProfileId', label: 'آكل الختيار الدائم', kind: 'player' },
  { id: 'oldManCount', label: 'عدد الختايرة لنفس اللاعب', kind: 'number' }, { id: 'doubledOldManCount', label: 'عدد الختايرة المدبلة لنفس اللاعب', kind: 'number' },
  { id: 'historicalOldManRecord', label: 'سجل تاريخي حقيقي', kind: 'boolean' }
];
const tarneebFields: ConditionalFieldDefinition[] = [
  { id: 'targetProfileId', label: 'الضامن الدائم', kind: 'player' }, { id: 'bid', label: 'الضمان', kind: 'number' }, { id: 'actualTricks', label: 'اللطوش الفعلية', kind: 'number' },
  { id: 'succeeded', label: 'نجح الضمان', kind: 'boolean' }, { id: 'failed', label: 'انكسر الضمان', kind: 'boolean' }, { id: 'isKaboot', label: 'كبوت', kind: 'boolean' },
  { id: 'brokenSeven', label: 'انكسار السبعة', kind: 'boolean' }, { id: 'failureStreak', label: 'سلسلة انكسارات', kind: 'number' },
  { id: 'successStreak', label: 'سلسلة نجاحات', kind: 'number' }, { id: 'kabootCount', label: 'عدد الكبوتات', kind: 'number' },
  { id: 'currentTeamScore', label: 'نتيجة الفريق الحالية', kind: 'number' }, { id: 'opponentScore', label: 'نتيجة الخصم الحالية', kind: 'number' },
  { id: 'matchTarget', label: 'هدف المباراة', kind: 'number' }, { id: 'remainingToTarget', label: 'المتبقي للهدف', kind: 'number' }
];

export function eventsForGame(game: ConditionalRuleGame): ConditionalRuleEvent[] {
  if (game === 'trix-fast') return ['lash', 'trix', 'old-man'];
  if (game === 'cc') return ['lash', 'old-man'];
  return ['tarneeb'];
}

export function conditionFieldsFor(game: ConditionalRuleGame, event: ConditionalRuleEvent): ConditionalFieldDefinition[] {
  if (!eventsForGame(game).includes(event)) return [];
  if (event === 'tarneeb') return tarneebFields;
  if (event === 'lash') return [...commonFast, ...lashFields];
  if (event === 'trix') return [...commonFast, ...trixFields];
  return [...commonFast, ...oldManFields];
}

export function operatorsForField(field: ConditionalFieldDefinition): ConditionalOperator[] {
  return field.kind === 'number' ? ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'] : ['eq', 'neq'];
}

export function placeholdersForEvent(event: ConditionalRuleEvent): string[] {
  if (event === 'tarneeb') return ['player', 'partner', 'team', 'opponent', 'opponentTeam', 'bid', 'actualTricks', 'target', 'remaining', 'score', 'absScore'];
  if (event === 'trix') return ['player', 'owner', 'partner', 'team', 'opponent', 'opponentTeam', 'position', 'score', 'absScore', 'kingdom'];
  if (event === 'old-man') return ['player', 'owner', 'partner', 'team', 'opponent', 'opponentTeam', 'oldManCount', 'kingdom'];
  return ['player', 'owner', 'partner', 'team', 'opponent', 'opponentTeam', 'score', 'absScore', 'kingdom'];
}

function numericBounds(conditions: ConditionalRuleCondition[]): string | undefined {
  for (const field of new Set(conditions.map((condition) => condition.field))) {
    const group = conditions.filter((condition) => condition.field === field && typeof condition.value === 'number');
    if (!group.length) continue;
    let lower = Number.NEGATIVE_INFINITY; let upper = Number.POSITIVE_INFINITY; let exact: number | undefined; const excluded = new Set<number>();
    for (const condition of group) {
      const value = Number(condition.value);
      if (condition.operator === 'eq') exact = exact === undefined ? value : exact === value ? exact : Number.NaN;
      if (condition.operator === 'neq') excluded.add(value);
      if (condition.operator === 'gt') lower = Math.max(lower, value + Number.EPSILON);
      if (condition.operator === 'gte') lower = Math.max(lower, value);
      if (condition.operator === 'lt') upper = Math.min(upper, value - Number.EPSILON);
      if (condition.operator === 'lte') upper = Math.min(upper, value);
      if (condition.operator === 'between') { lower = Math.max(lower, Math.min(value, condition.valueTo ?? value)); upper = Math.min(upper, Math.max(value, condition.valueTo ?? value)); }
    }
    if (Number.isNaN(exact) || lower > upper || exact !== undefined && (exact < lower || exact > upper || excluded.has(exact))) return `شروط «${fieldLabel(field)}» متناقضة`;
  }
}

export function validateConditionalRule(rule: ConditionalReactionRule): string[] {
  const errors: string[] = [];
  if (!rule.name.trim()) errors.push('اسم القاعدة مطلوب');
  if (!eventsForGame(rule.game).includes(rule.event)) errors.push('الحدث غير متاح للعبة المختارة');
  if (!rule.conditions.length) errors.push('أضف شرطًا واحدًا على الأقل');
  if (!rule.messages.some((message) => message.enabled && message.text.trim())) errors.push('أضف رسالة مفعلة واحدة على الأقل');
  if (!Number.isInteger(rule.priority) || rule.priority < 1 || rule.priority > 100) errors.push('الأولوية يجب أن تكون بين 1 و100');
  if (rule.durationMs < 1000 || rule.durationMs > 30000) errors.push('المدة يجب أن تكون بين ثانية و30 ثانية');
  if (!Number.isInteger(rule.cooldownRounds) || rule.cooldownRounds < 0 || rule.cooldownRounds > 20) errors.push('الحماية من التكرار يجب أن تكون بين 0 و20 جولة');
  const allowed = new Map(conditionFieldsFor(rule.game, rule.event).map((field) => [field.id, field]));
  for (const condition of rule.conditions) {
    const field = allowed.get(condition.field);
    if (!field) errors.push(`الشرط ${condition.field} غير متاح لهذا الحدث`);
    else if (!operatorsForField(field).includes(condition.operator)) errors.push(`المعامل غير صالح للحقل ${field.label}`);
    if (field?.kind === 'player' && !String(condition.value)) errors.push(`اختر لاعبًا دائمًا للحقل ${field.label}`);
    if (condition.operator === 'between' && typeof condition.valueTo !== 'number') errors.push(`أدخل نهاية المجال للحقل ${field?.label ?? condition.field}`);
  }
  const contradiction = numericBounds(rule.conditions); if (contradiction) errors.push(contradiction);
  return [...new Set(errors)];
}

function compare(actual: ConditionalValue | undefined, condition: ConditionalRuleCondition): boolean {
  if (actual === undefined) return false;
  if (condition.operator === 'eq') return actual === condition.value;
  if (condition.operator === 'neq') return actual !== condition.value;
  if (typeof actual !== 'number' || typeof condition.value !== 'number') return false;
  if (condition.operator === 'gt') return actual > condition.value;
  if (condition.operator === 'gte') return actual >= condition.value;
  if (condition.operator === 'lt') return actual < condition.value;
  if (condition.operator === 'lte') return actual <= condition.value;
  const end = condition.valueTo ?? condition.value;
  return actual >= Math.min(condition.value, end) && actual <= Math.max(condition.value, end);
}

function valueForCondition(condition: ConditionalRuleCondition, rule: ConditionalReactionRule, context: ConditionalReactionContext): ConditionalValue | undefined {
  if (condition.field === 'targetProfileId') return context.actorProfileId ?? (context.participantProfileIds.includes(String(condition.value)) ? condition.value : undefined);
  if (condition.field === 'ownerTeamProfileId') return context.ownerTeamProfileIds?.includes(String(condition.value)) ? condition.value : '__not_in_owner_team__';
  if (condition.field === 'opponentTeamProfileId') return context.opponentTeamProfileIds?.includes(String(condition.value)) ? condition.value : '__not_in_opponent_team__';
  if (condition.field === 'targetPlayerPosition') {
    const target = rule.conditions.find((candidate) => candidate.field === 'targetProfileId' && candidate.operator === 'eq');
    return target ? context.profilePositions?.[String(target.value)] : undefined;
  }
  return context.values[condition.field];
}

export function ruleMatches(rule: ConditionalReactionRule, context: ConditionalReactionContext): boolean {
  return rule.enabled && rule.game === context.game && rule.event === context.event && (!rule.intensity || rule.intensity <= context.intensity) && rule.conditions.every((condition) => compare(valueForCondition(condition, rule, context), condition));
}

const specificity = (rule: ConditionalReactionRule) => rule.conditions.reduce((score, condition) => score + (condition.operator === 'between' ? 2 : 1) + (condition.field.includes('ProfileId') ? 2 : 0), 0);

export function selectConditionalReaction(rules: ConditionalReactionRule[], context: ConditionalReactionContext, firings: ConditionalRuleFiring[], random: () => number = Math.random): ConditionalReactionSelection | undefined {
  const matching = rules.filter((rule) => {
    if (!ruleMatches(rule, context)) return false;
    const previous = firings.filter((firing) => firing.gameId === context.gameId && firing.ruleId === rule.id).sort((a, b) => b.roundIndex - a.roundIndex || b.firedAt.localeCompare(a.firedAt));
    if (rule.oncePerMatch && previous.length) return false;
    return !(rule.cooldownRounds > 0 && previous[0] && context.roundIndex - previous[0].roundIndex <= rule.cooldownRounds);
  }).sort((left, right) => Number(right.exclusive) - Number(left.exclusive) || right.priority - left.priority || specificity(right) - specificity(left) || left.order - right.order || left.id.localeCompare(right.id));
  const rule = matching[0]; if (!rule) return undefined;
  const enabled = rule.messages.filter((message) => message.enabled && message.text.trim());
  if (!enabled.length) return undefined;
  const lastAlternativeId = firings.filter((firing) => firing.gameId === context.gameId && firing.ruleId === rule.id).sort((a, b) => b.firedAt.localeCompare(a.firedAt))[0]?.alternativeId;
  const fresh = enabled.length > 1 ? enabled.filter((alternative) => alternative.id !== lastAlternativeId) : enabled;
  const pool = fresh.length ? fresh : enabled;
  return { rule, alternative: pool[Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))] };
}

export function indexConditionalRules(rules: ConditionalReactionRule[]): Map<string, ConditionalReactionRule[]> {
  const index = new Map<string, ConditionalReactionRule[]>();
  for (const rule of rules) { const key = `${rule.game}:${rule.event}`; index.set(key, [...(index.get(key) ?? []), rule]); }
  return index;
}

export function fieldLabel(field: ConditionalField): string {
  return [...commonFast, ...lashFields, ...trixFields, ...oldManFields, ...tarneebFields].find((candidate) => candidate.id === field)?.label ?? field;
}

export function summarizeConditionalRule(rule: ConditionalReactionRule, playerNames: Record<string, string> = {}): string {
  const conditions = rule.conditions.map((condition) => {
    const value = typeof condition.value === 'boolean' ? condition.value ? 'نعم' : 'لا' : playerNames[String(condition.value)] ?? String(condition.value);
    const end = condition.operator === 'between' ? ` و${condition.valueTo}` : '';
    return `${fieldLabel(condition.field)} ${CONDITIONAL_OPERATOR_LABELS[condition.operator]} ${value}${end}`;
  }).join(' AND ');
  return `${CONDITIONAL_GAME_LABELS[rule.game]} + ${CONDITIONAL_EVENT_LABELS[rule.event]} + ${conditions}`;
}
