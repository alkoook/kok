import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '../../db/database';
import { interpolateTemplate } from '../../games/fast/messages';
import {
  CONDITIONAL_EVENT_LABELS,
  CONDITIONAL_GAME_LABELS,
  CONDITIONAL_OPERATOR_LABELS,
  conditionFieldsFor,
  eventsForGame,
  operatorsForField,
  placeholdersForEvent,
  summarizeConditionalRule,
  validateConditionalRule,
  type ConditionalFieldDefinition
} from '../../games/reactions/conditionalRules';
import type { ConditionalReactionRule, ConditionalRuleCondition, ConditionalRuleEvent, ConditionalRuleGame, ConditionalValue, PlayerProfile } from '../../types';
import { formatDate, uid } from '../../utils';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ContextMessageOverlay } from '../fast/ContextMessageOverlay';

const newRule = (order: number): ConditionalReactionRule => {
  const timestamp = new Date().toISOString();
  return { id: uid(), name: '', enabled: true, game: 'trix-fast', event: 'lash', conditions: [], messages: [{ id: uid(), text: '', enabled: true }], durationMs: 5000, priority: 50, exclusive: false, oncePerMatch: false, cooldownRounds: 0, order, createdAt: timestamp, updatedAt: timestamp };
};

export function ConditionalMessageSettings() {
  const rules = useLiveQuery(() => db.conditionalRules.toArray(), [], []);
  const firings = useLiveQuery(() => db.conditionalRuleFirings.toArray(), [], []);
  const players = useLiveQuery(() => db.players.toArray(), [], []);
  const [editing, setEditing] = useState<ConditionalReactionRule>();
  const [preview, setPreview] = useState<string>();
  const [query, setQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<'all' | ConditionalRuleGame>('all');
  const [eventFilter, setEventFilter] = useState<'all' | ConditionalRuleEvent>('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [exclusiveFilter, setExclusiveFilter] = useState<'all' | 'exclusive' | 'normal'>('all');
  const names = Object.fromEntries(players.map((player) => [player.id, player.name]));
  const shown = rules.filter((rule) => {
    const text = `${rule.name} ${rule.messages.map((message) => message.text).join(' ')}`;
    return (!query || text.includes(query)) && (gameFilter === 'all' || rule.game === gameFilter) && (eventFilter === 'all' || rule.event === eventFilter) &&
      (enabledFilter === 'all' || rule.enabled === (enabledFilter === 'enabled')) && (exclusiveFilter === 'all' || rule.exclusive === (exclusiveFilter === 'exclusive'));
  }).sort((left, right) => right.priority - left.priority || left.order - right.order);
  const lastFiring = useMemo(() => new Map(rules.map((rule) => [rule.id, firings.filter((firing) => firing.ruleId === rule.id).sort((a, b) => b.firedAt.localeCompare(a.firedAt))[0]])), [firings, rules]);
  const save = async (rule: ConditionalReactionRule) => { await db.conditionalRules.put({ ...rule, updatedAt: new Date().toISOString() }); setEditing(undefined); };
  const duplicate = (rule: ConditionalReactionRule) => { const timestamp = new Date().toISOString(); setEditing({ ...structuredClone(rule), id: uid(), name: `${rule.name} — نسخة`, order: Date.now(), createdAt: timestamp, updatedAt: timestamp, messages: rule.messages.map((message) => ({ ...message, id: uid() })) }); };
  return <section className="mt-5 space-y-3">
    <div className="surface p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">الرسائل المشروطة</h2><p className="muted mt-1 text-xs">قواعد محلية تعمل بـAND، وتختار رسالة واحدة فقط لكل حدث.</p></div><Button size="sm" icon={<Plus/>} onClick={() => setEditing(newRule(rules.length + 1))}>إضافة رسالة مشروطة</Button></div>
      <input className="field mt-3" aria-label="بحث القواعد المشروطة" placeholder="ابحث بالاسم أو الرسالة" value={query} onChange={(event) => setQuery(event.target.value)}/>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><FilterSelect label="تصفية اللعبة" value={gameFilter} onChange={(value) => setGameFilter(value as typeof gameFilter)} options={[['all', 'كل الألعاب'], ...Object.entries(CONDITIONAL_GAME_LABELS)]}/><FilterSelect label="تصفية الحدث" value={eventFilter} onChange={(value) => setEventFilter(value as typeof eventFilter)} options={[['all', 'كل الأحداث'], ...Object.entries(CONDITIONAL_EVENT_LABELS)]}/><FilterSelect label="تصفية التفعيل" value={enabledFilter} onChange={(value) => setEnabledFilter(value as typeof enabledFilter)} options={[['all', 'الكل'], ['enabled', 'مفعلة'], ['disabled', 'معطلة']]}/><FilterSelect label="تصفية الحصرية" value={exclusiveFilter} onChange={(value) => setExclusiveFilter(value as typeof exclusiveFilter)} options={[['all', 'الكل'], ['exclusive', 'حصرية'], ['normal', 'عادية']]}/></div>
    </div>
    {shown.map((rule) => { const fired = lastFiring.get(rule.id); return <article className="surface p-4" key={rule.id}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{rule.name}</strong>{rule.exclusive && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-600">حصرية</span>}<span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-600">أولوية {rule.priority}</span></div><p className="muted mt-1 text-xs leading-6">{summarizeConditionalRule(rule, names)}</p><small className="muted mt-1 block">آخر مرة اشتغلت: {fired ? `${formatDate(fired.firedAt)} · ${fired.event} · ${fired.gameId.slice(0, 8)}` : 'لم تعمل بعد'}</small></div><input aria-label={`تفعيل القاعدة ${rule.name}`} type="checkbox" className="size-5 accent-mint-500" checked={rule.enabled} onChange={() => db.conditionalRules.update(rule.id, { enabled: !rule.enabled, updatedAt: new Date().toISOString() })}/></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" icon={<Pencil/>} onClick={() => setEditing(structuredClone(rule))}>تعديل</Button><Button size="sm" variant="ghost" icon={<Copy/>} onClick={() => duplicate(rule)}>نسخ القاعدة</Button><Button size="sm" variant="ghost" icon={<Eye/>} onClick={() => setPreview(sampleMessage(rule.messages.find((message) => message.enabled)?.text ?? ''))}>معاينة</Button><Button size="sm" variant="danger" icon={<Trash2/>} onClick={async () => { if (!confirm(`حذف القاعدة ${rule.name}؟`)) return; await db.transaction('rw', db.conditionalRules, db.conditionalRuleFirings, async () => { await db.conditionalRules.delete(rule.id); await db.conditionalRuleFirings.where('ruleId').equals(rule.id).delete(); }); }}>حذف</Button></div></article>; })}
    {!shown.length && <div className="surface p-8 text-center"><p className="muted">لا توجد قواعد مطابقة.</p></div>}
    <Modal open={Boolean(editing)} title={editing?.name ? 'تعديل الرسالة المشروطة' : 'إضافة رسالة مشروطة'} onClose={() => setEditing(undefined)}>{editing && <RuleEditor initial={editing} players={players} onSave={save}/>}</Modal>
    {preview && <ContextMessageOverlay message={preview} durationMs={5000} onDismiss={() => setPreview(undefined)}/>}
  </section>;
}

function RuleEditor({ initial, players, onSave }: { initial: ConditionalReactionRule; players: PlayerProfile[]; onSave: (rule: ConditionalReactionRule) => Promise<void> }) {
  const [rule, setRule] = useState(initial); const [errors, setErrors] = useState<string[]>([]); const fields = conditionFieldsFor(rule.game, rule.event);
  const patch = (changes: Partial<ConditionalReactionRule>) => setRule((current) => ({ ...current, ...changes }));
  const changeGame = (game: ConditionalRuleGame) => { const event = eventsForGame(game)[0]; patch({ game, event, conditions: [] }); };
  const updateCondition = (index: number, condition: ConditionalRuleCondition) => patch({ conditions: rule.conditions.map((item, itemIndex) => itemIndex === index ? condition : item) });
  const addCondition = () => { const field = fields[0]; if (!field) return; patch({ conditions: [...rule.conditions, { id: uid(), field: field.id, operator: 'eq', value: defaultValue(field, players) }] }); };
  const submit = async () => { const validation = validateConditionalRule(rule); setErrors(validation); if (!validation.length) await onSave(rule); };
  return <div className="space-y-4">
    <label><span className="label">اسم القاعدة</span><input className="field" aria-label="اسم القاعدة" value={rule.name} onChange={(event) => patch({ name: event.target.value })}/></label>
    <div className="grid grid-cols-2 gap-2"><label><span className="label">اللعبة</span><select className="field" aria-label="لعبة القاعدة" value={rule.game} onChange={(event) => changeGame(event.target.value as ConditionalRuleGame)}>{Object.entries(CONDITIONAL_GAME_LABELS).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label><span className="label">الحدث</span><select className="field" aria-label="حدث القاعدة" value={rule.event} onChange={(event) => patch({ event: event.target.value as ConditionalRuleEvent, conditions: [] })}>{eventsForGame(rule.game).map((event) => <option value={event} key={event}>{CONDITIONAL_EVENT_LABELS[event]}</option>)}</select></label></div>
    <section className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><div className="flex items-center justify-between"><h3 className="font-black">الشروط · AND</h3><Button size="sm" variant="secondary" icon={<Plus/>} onClick={addCondition}>إضافة شرط</Button></div><div className="mt-3 space-y-3">{rule.conditions.map((condition, index) => { const definition = fields.find((field) => field.id === condition.field) ?? fields[0]; return <ConditionEditor key={condition.id} index={index} condition={condition} definition={definition} fields={fields} players={players} onChange={(next) => updateCondition(index, next)} onRemove={() => patch({ conditions: rule.conditions.filter((_, itemIndex) => itemIndex !== index) })}/>; })}</div></section>
    <section className="rounded-2xl border border-[var(--border)] p-3"><div className="flex items-center justify-between"><h3 className="font-black">الرسائل</h3><Button size="sm" variant="secondary" icon={<Plus/>} onClick={() => patch({ messages: [...rule.messages, { id: uid(), text: '', enabled: true }] })}>بديل</Button></div><div className="mt-3 space-y-3">{rule.messages.map((message, index) => <div className="rounded-xl bg-slate-100 p-2 dark:bg-white/5" key={message.id}><div className="flex gap-2"><textarea className="field min-h-24" aria-label={`نص الرسالة ${index + 1}`} value={message.text} onChange={(event) => patch({ messages: rule.messages.map((item) => item.id === message.id ? { ...item, text: event.target.value } : item) })}/><button aria-label={`حذف الرسالة ${index + 1}`} disabled={rule.messages.length === 1} onClick={() => patch({ messages: rule.messages.filter((item) => item.id !== message.id) })}><X/></button></div><label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={message.enabled} onChange={() => patch({ messages: rule.messages.map((item) => item.id === message.id ? { ...item, enabled: !item.enabled } : item) })}/> مفعلة</label></div>)}</div><div className="mt-3 flex flex-wrap gap-1">{placeholdersForEvent(rule.event).map((placeholder) => <code className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs" key={placeholder}>{`{${placeholder}}`}</code>)}</div></section>
    <div className="grid grid-cols-2 gap-2"><label><span className="label">المدة بالثواني</span><input className="field" aria-label="مدة الرسالة" type="number" min="1" max="30" value={rule.durationMs / 1000} onChange={(event) => patch({ durationMs: Number(event.target.value) * 1000 })}/></label><label><span className="label">الأولوية 1–100</span><input className="field" aria-label="أولوية القاعدة" type="number" min="1" max="100" value={rule.priority} onChange={(event) => patch({ priority: Number(event.target.value) })}/></label><label><span className="label">حماية التكرار بالجولات</span><input className="field" aria-label="حماية التكرار" type="number" min="0" max="20" value={rule.cooldownRounds} onChange={(event) => patch({ cooldownRounds: Number(event.target.value) })}/></label><label><span className="label">مستوى اختياري</span><select className="field" aria-label="مستوى القاعدة" value={rule.intensity ?? ''} onChange={(event) => patch({ intensity: event.target.value ? Number(event.target.value) as 1 | 2 | 3 | 4 : undefined })}><option value="">لا يتبع المستوى</option><option value="1">خفيف</option><option value="2">عادي</option><option value="3">عالي</option><option value="4">بلا رحمة</option></select></label></div>
    <div className="grid gap-2"><Check label="حصرية" checked={rule.exclusive} onChange={(exclusive) => patch({ exclusive })}/><Check label="مرة واحدة بالقعدة" checked={rule.oncePerMatch} onChange={(oncePerMatch) => patch({ oncePerMatch })}/><Check label="مفعلة" checked={rule.enabled} onChange={(enabled) => patch({ enabled })}/></div>
    <div className="rounded-2xl bg-violet-500/10 p-3"><span className="eyebrow">معاينة القاعدة</span><p className="mt-1 text-sm font-black leading-6">{summarizeConditionalRule(rule, Object.fromEntries(players.map((player) => [player.id, player.name])))}</p></div>
    {errors.length > 0 && <div className="rounded-2xl bg-red-500/10 p-3 text-sm font-bold text-red-600">{errors.map((error) => <p key={error}>• {error}</p>)}</div>}
    <Button className="w-full" size="lg" onClick={submit}>حفظ القاعدة</Button>
  </div>;
}

function ConditionEditor({ index, condition, definition, fields, players, onChange, onRemove }: { index: number; condition: ConditionalRuleCondition; definition: ConditionalFieldDefinition; fields: ConditionalFieldDefinition[]; players: PlayerProfile[]; onChange: (condition: ConditionalRuleCondition) => void; onRemove: () => void }) {
  const setField = (fieldId: string) => { const field = fields.find((candidate) => candidate.id === fieldId)!; onChange({ id: condition.id, field: field.id, operator: 'eq', value: defaultValue(field, players) }); };
  return <div className="rounded-xl bg-[var(--surface)] p-2"><div className="flex gap-2"><select className="field" aria-label={`حقل الشرط ${index + 1}`} value={condition.field} onChange={(event) => setField(event.target.value)}>{fields.map((field) => <option value={field.id} key={field.id}>{field.label}</option>)}</select><button aria-label={`حذف الشرط ${index + 1}`} onClick={onRemove}><X/></button></div><div className="mt-2 grid grid-cols-2 gap-2"><select className="field" aria-label={`معامل الشرط ${index + 1}`} value={condition.operator} onChange={(event) => onChange({ ...condition, operator: event.target.value as ConditionalRuleCondition['operator'], valueTo: event.target.value === 'between' ? Number(condition.value) : undefined })}>{operatorsForField(definition).map((operator) => <option value={operator} key={operator}>{CONDITIONAL_OPERATOR_LABELS[operator]}</option>)}</select><ConditionValue ariaLabel={`قيمة الشرط ${index + 1}`} definition={definition} value={condition.value} players={players} onChange={(value) => onChange({ ...condition, value })}/>{condition.operator === 'between' && <input className="field col-span-2" aria-label={`نهاية الشرط ${index + 1}`} type="number" value={condition.valueTo ?? ''} onChange={(event) => onChange({ ...condition, valueTo: Number(event.target.value) })}/>}</div></div>;
}

function ConditionValue({ ariaLabel, definition, value, players, onChange }: { ariaLabel: string; definition: ConditionalFieldDefinition; value: ConditionalValue; players: PlayerProfile[]; onChange: (value: ConditionalValue) => void }) {
  if (definition.kind === 'boolean') return <select className="field" aria-label={ariaLabel} value={String(value)} onChange={(event) => onChange(event.target.value === 'true')}><option value="true">نعم</option><option value="false">لا</option></select>;
  if (definition.kind === 'player') return <select className="field" aria-label={ariaLabel} value={String(value)} onChange={(event) => onChange(event.target.value)}><option value="">اختر لاعبًا دائمًا</option>{players.map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}</select>;
  if (definition.kind === 'select') return <select className="field" aria-label={ariaLabel} value={String(value)} onChange={(event) => onChange(event.target.value)}>{definition.options?.map((option) => <option value={String(option.value)} key={String(option.value)}>{option.label}</option>)}</select>;
  return <input className="field" aria-label={ariaLabel} type="number" value={Number(value)} onChange={(event) => onChange(Number(event.target.value))}/>;
}

function defaultValue(field: ConditionalFieldDefinition, players: PlayerProfile[]): ConditionalValue {
  if (field.kind === 'number') return 0;
  if (field.kind === 'boolean') return true;
  if (field.kind === 'player') return players[0]?.id ?? '';
  return field.options?.[0]?.value ?? '';
}
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <select className="field text-xs" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, text]) => <option value={id} key={id}>{text}</option>)}</select>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-12 items-center justify-between rounded-2xl bg-slate-100 px-4 font-bold dark:bg-white/5"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}/></label>; }
function sampleMessage(template: string) { return interpolateTemplate(template, { owner: 'أحمد', player: 'أحمد', partner: 'علي', team: 'أحمد وعلي', opponent: 'عمر', opponentTeam: 'عمر وزياد', score: -350, absScore: 350, position: 4, bid: 10, actualTricks: 8, target: 61, remaining: 5, oldManCount: 2, kingdom: 1 }); }
