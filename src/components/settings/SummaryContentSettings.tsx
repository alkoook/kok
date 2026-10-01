import { useLiveQuery } from 'dexie-react-hooks';
import { RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { db } from '../../db/database';
import { effectiveSummaryContent, type SummarySegment, type TitleDefinition } from '../../games/fast/summaryContent';
import type { ContentOverride, SummarySegmentCategory } from '../../types';
import { Button } from '../common/Button';

const labels: Record<SummarySegmentCategory, string> = { opening: 'الافتتاحيات', winner: 'الفائز', disaster: 'الكوارث', partnership: 'الشراكة', trix: 'التركس', kingdom: 'الممالك', 'old-man': 'الختيار', comeback: 'القلبات', closing: 'الخواتيم', title: 'الألقاب' };
type Item = SummarySegment | TitleDefinition;

export function SummaryContentSettings() {
  const overrides = useLiveQuery(() => db.contentOverrides.toArray(), [], []);
  const content = useMemo(() => effectiveSummaryContent(overrides), [overrides]);
  const all: Item[] = [...content.segments, ...content.titles];
  const [category, setCategory] = useState<SummarySegmentCategory>('opening');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(24);
  const shown = all.filter((item) => item.category === category && (!query || item.template.includes(query)));
  const save = (item: Item, changes: Pick<ContentOverride, 'template' | 'enabled'>) => db.contentOverrides.put({ id: item.factoryId, factoryId: item.factoryId, category: item.category, ...changes, updatedAt: new Date().toISOString() });
  return <section className="mt-5">
    <div className="surface p-4"><h2 className="text-lg font-black">ملخصات القعدة والألقاب</h2><p className="muted mt-1 text-xs">فلترة وبحث وتعديل دون تحميل مئات الحقول المفتوحة دفعة واحدة.</p><div className="scrollbar-hidden mt-3 flex gap-2 overflow-x-auto">{(Object.keys(labels) as SummarySegmentCategory[]).map((id) => <button key={id} onClick={() => { setCategory(id); setLimit(24); }} className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-black ${category === id ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>{labels[id]} ({all.filter((item) => item.category === id).length})</button>)}</div><label className="relative mt-3 block"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field pe-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في المحتوى"/></label><Button className="mt-3" size="sm" variant="ghost" icon={<RotateCcw/>} onClick={() => db.contentOverrides.where('category').equals(category).delete()}>استعادة القسم كاملًا</Button></div>
    <div className="mt-3 space-y-2">{shown.slice(0, limit).map((item) => <details className="surface p-3" key={item.id}><summary className="flex cursor-pointer list-none items-center justify-between gap-2"><span className="muted min-w-0 truncate text-xs">{item.template}</span><input aria-label={`تفعيل ${item.id}`} type="checkbox" className="size-5 shrink-0 accent-violet-500" checked={item.enabled} onClick={(event) => event.stopPropagation()} onChange={(event) => save(item, { enabled: event.target.checked })}/></summary><textarea className="field mt-3 min-h-24" value={item.template} onChange={(event) => save(item, { template: event.target.value })}/><Button className="mt-2" size="sm" variant="ghost" icon={<RotateCcw/>} onClick={() => db.contentOverrides.delete(item.factoryId)}>الافتراضي</Button></details>)}</div>
    {shown.length > limit && <Button className="mt-3 w-full" variant="secondary" onClick={() => setLimit((value) => value + 24)}>عرض المزيد ({shown.length - limit})</Button>}
  </section>;
}
