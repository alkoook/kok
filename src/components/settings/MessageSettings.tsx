import { useLiveQuery } from 'dexie-react-hooks';
import { Eye, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '../../db/database';
import { effectiveMessageRules } from '../../games/fast/messages';
import type { MessageCategory, MessageRule } from '../../types';
import { uid } from '../../utils';
import { Button } from '../common/Button';
import { ContextMessageOverlay } from '../fast/ContextMessageOverlay';

const labels: Record<MessageCategory, string> = {
  'fast-lash': 'تركس سريعة — لطش', 'fast-trix': 'تركس سريعة — تركس', 'old-man': 'الختيار والمدبل',
  'tarneeb-success': 'طرنيب — النجاح', 'tarneeb-failure': 'طرنيب — الانكسار', 'tarneeb-special': 'طرنيب — الحالات الخاصة', 'cc-lash': 'CC — لطش'
};
const condition = (rule: MessageRule) => rule.event === 'lash-owner-score' ? rule.minScore === rule.maxScore ? `بالضبط ${rule.minScore}` : rule.minScore === undefined ? `${rule.maxScore} أو أقل` : rule.maxScore === undefined ? 'نتيجة موجبة' : `من ${rule.minScore} إلى ${rule.maxScore}` : rule.event === 'trix-partnership' ? `صاحب المملكة ${rule.ownerScore} / شريكه ${rule.partnerScore}` : rule.event.startsWith('old-man') ? `${rule.event === 'old-man-owner' ? 'صاحب المملكة' : rule.event === 'old-man-partner' ? 'الشريك' : 'الخصم'} أكل الختيار${rule.doubled ? ' مدبل' : ''}` : rule.id;

export function MessageSettings() {
  const stored = useLiveQuery(() => db.messageRules.toArray(), [], []);
  const rules = useMemo(() => effectiveMessageRules(stored), [stored]);
  const [preview, setPreview] = useState<MessageRule>();
  const [category, setCategory] = useState<MessageCategory>('fast-lash');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const filtered = rules.filter((rule) => rule.category === category && (!query || rule.template.includes(query) || condition(rule).includes(query)));
  const update = async (rule: MessageRule, changes: Partial<MessageRule>) => {
    const existing = stored.find((item) => item.id === rule.id);
    if (existing) await db.messageRules.update(existing.id, { ...changes, updatedAt: new Date().toISOString() });
    else await db.messageRules.put({ ...rule, ...changes, updatedAt: new Date().toISOString() });
  };
  const resetCategory = async () => {
    const ids = stored.filter((rule) => rule.category === category).map((rule) => rule.id);
    await db.messageRules.bulkDelete(ids);
  };
  return <div className="space-y-3">
    <section className="surface p-4"><h2 className="font-black">رسائل اللعبة</h2><p className="muted mt-1 text-xs">المحتوى الأصلي ثابت داخل التطبيق، وتُحفظ تعديلاتك كطبقة محلية مستقلة.</p><div className="scrollbar-hidden mt-3 flex gap-2 overflow-x-auto">{(Object.keys(labels) as MessageCategory[]).map((id) => <button key={id} onClick={() => { setCategory(id); setLimit(24); }} className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-black ${category === id ? 'bg-mint-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>{labels[id]} ({rules.filter((rule) => rule.category === id).length})</button>)}</div><label className="relative mt-3 block"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field pe-10" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(24); }} placeholder="ابحث بالنص أو الشرط"/></label><Button className="mt-3" size="sm" variant="ghost" icon={<RotateCcw/>} onClick={resetCategory}>استعادة القسم كاملًا</Button></section>
    <div className="space-y-2">{filtered.slice(0, limit).map((rule) => <details className="surface p-3" key={rule.id}><summary className="flex cursor-pointer list-none items-center justify-between gap-2"><div className="min-w-0"><span className="block truncate text-xs font-black text-mint-600">{condition(rule)}</span><span className="muted block truncate text-xs">{rule.template}</span></div><input aria-label={`تفعيل ${rule.id}`} type="checkbox" className="size-5 shrink-0 accent-mint-500" checked={rule.enabled} onClick={(event) => event.stopPropagation()} onChange={(event) => update(rule, { enabled: event.target.checked })}/></summary><div className="mt-3"><textarea className="field min-h-28 py-3" value={rule.template} onChange={(event) => update(rule, { template: event.target.value })}/><label className="mt-2 flex items-center gap-2 text-xs font-bold">المدة بالثواني<input className="field min-h-10 w-24" type="number" min="1" max="30" value={rule.durationMs / 1000} onChange={(event) => update(rule, { durationMs: Number(event.target.value) * 1000 })}/></label><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="secondary" icon={<Eye/>} onClick={() => setPreview(rule)}>معاينة</Button>{!rule.userAdded && <Button size="sm" variant="ghost" icon={<RotateCcw/>} onClick={() => db.messageRules.delete(rule.id)}>الافتراضي</Button>}{rule.userAdded && <Button size="sm" variant="danger" icon={<Trash2/>} onClick={() => db.messageRules.delete(rule.id)}>حذف</Button>}<Button size="sm" variant="ghost" icon={<Plus/>} onClick={() => { const id = uid(); const timestamp = new Date().toISOString(); db.messageRules.add({ ...rule, id, factoryId: id, template: `${rule.template} — بديل`, userAdded: true, createdAt: timestamp, updatedAt: timestamp }); }}>بديل</Button></div></div></details>)}</div>
    {filtered.length > limit && <Button className="w-full" variant="secondary" onClick={() => setLimit((value) => value + 24)}>عرض المزيد ({filtered.length - limit})</Button>}
    {preview && <ContextMessageOverlay message={preview.template.replace('{owner}', 'أحمد').replace('{partner}', 'علي').replace('{team}', 'فريق أحمد وعلي').replace('{opponentTeam}', 'فريق عمر وزياد').replace('{absScore}', '250')} durationMs={preview.durationMs} onDismiss={() => setPreview(undefined)}/>}
  </div>;
}
