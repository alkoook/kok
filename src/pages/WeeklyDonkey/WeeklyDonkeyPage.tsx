import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/toast-context';
import { db } from '../../db/database';
import { buildWeeklyRoast, buildWeeklySubtitle } from '../../features/weekly-donkey/buildWeeklyRoast';
import { calculateWeeklyDonkey, getLocalWeekBounds, shiftLocalWeek, type WeeklyPlayerStats } from '../../features/weekly-donkey/calculateWeeklyDonkey';

const dateLabel = (date: Date) => new Intl.DateTimeFormat('ar-SY', { day: 'numeric', month: 'long' }).format(date);

export function WeeklyDonkeyPage() {
  const games = useLiveQuery(() => db.games.toArray(), [], []); const rounds = useLiveQuery(() => db.rounds.toArray(), [], []); const toast = useToast(); const [offset, setOffset] = useState(0);
  const current = useMemo(() => getLocalWeekBounds(), []); const bounds = useMemo(() => shiftLocalWeek(current, offset), [current, offset]);
  const result = useMemo(() => calculateWeeklyDonkey(games, rounds, bounds), [bounds, games, rounds]); const end = new Date(bounds.endExclusive); end.setDate(end.getDate() - 1);
  const range = `${dateLabel(bounds.start)} – ${dateLabel(end)}`; const title = result.winners.length > 1 ? 'حمير الأسبوع' : 'حمار الأسبوع';
  const share = async () => { if (!result.winners.length) return; const text = `🐴 ${title}\n${result.winners.map((winner) => winner.name).join(' و ')}\n${result.winners.flatMap((winner) => winner.reasons.slice(0, 3)).join('\n')}\n${buildWeeklyRoast(bounds.key, result.winners.map((winner) => winner.profileId).join('-'))}\n${range}`; try { if (navigator.share) await navigator.share({ title: `KOK — ${title}`, text }); else { await navigator.clipboard.writeText(text); toast('تم نسخ البطاقة للمشاركة'); } } catch { /* user cancelled */ } };

  return <main className="page"><header className="mb-4"><span className="eyebrow">محكمة الأرقام الأسبوعية</span><h1 className="text-3xl font-black">🐴 حمار الأسبوع</h1><p className="muted mt-1 text-sm">لقب ساخر مبني فقط على نتائج اللعب المسجلة.</p></header>
    <div className="mb-4 grid grid-cols-[3rem_1fr_3rem] items-center gap-2"><button className="grid size-12 place-items-center rounded-2xl bg-[var(--surface)]" onClick={() => setOffset((value) => value - 1)} aria-label="الأسبوع السابق"><ChevronRight/></button><button className="min-h-12 rounded-2xl bg-[var(--surface)] px-3 text-sm font-black" onClick={() => setOffset(0)}>{offset === 0 ? 'الأسبوع الحالي' : range}</button><button className="grid size-12 place-items-center rounded-2xl bg-[var(--surface)] disabled:opacity-30" disabled={offset >= 0} onClick={() => setOffset((value) => value + 1)} aria-label="الأسبوع التالي"><ChevronLeft/></button></div>
    {!result.winners.length ? <section className="surface py-16 text-center"><div className="text-6xl">🐴</div><h2 className="mt-4 text-xl font-black">الأسبوع هاد لسا ما فضح حدا.</h2><p className="muted mx-auto mt-2 max-w-sm text-sm">يلزم كل مرشح قعدتين مكتملتين على الأقل بين الاثنين والأحد.</p><span className="muted mt-4 block text-xs">{range}</span></section> : <>
      <section className="weekly-donkey-card relative overflow-hidden rounded-[2rem] border border-amber-400/30 bg-gradient-to-br from-[#17130f] via-[#211b14] to-[#0d1118] p-6 text-white shadow-2xl"><div className="absolute -left-10 -top-10 size-40 rounded-full bg-amber-400/10 blur-3xl"/><div className="relative"><div className="flex items-start justify-between"><div><span className="text-xs font-black text-amber-300">بطاقة شرف معكوسة</span><h2 className="mt-1 text-3xl font-black">🐴 {title}</h2></div><div className="donkey-seal grid size-16 place-items-center rounded-full border-2 border-amber-300/50 bg-amber-300/10 text-3xl">🐴</div></div><p className="mt-5 text-lg font-bold text-slate-200">{buildWeeklySubtitle(bounds.key, result.winners.map((winner) => winner.profileId).join('-'))}</p><div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5"><span className="text-xs text-slate-400">صاحب البطاقة</span><strong className="mt-1 block text-4xl font-black text-amber-300">{result.winners.map((winner) => winner.name).join(' و ')}</strong><span className="mt-2 block text-xs text-slate-400">مدة الحكم: هذا الأسبوع 😂 · {range}</span></div></div></section>
      <div className="mt-4 space-y-4">{result.winners.map((winner) => <Evidence key={winner.profileId} winner={winner} weekKey={bounds.key}/>)}</div>
      <Button className="mt-4 w-full" variant="secondary" icon={<Share2 size={18}/>} onClick={share}>شارك البطاقة</Button>
    </>}
  </main>;
}

function Evidence({ winner, weekKey }: { winner: WeeklyPlayerStats; weekKey: string }) {
  return <section className="surface p-5"><span className="eyebrow">تقرير الفضيحة · {winner.completedGames} قعدات مكتملة</span><h2 className="mt-1 text-xl font-black">الأدلة ضد {winner.name}</h2><div className="mt-4 space-y-2">{winner.reasons.map((reason) => <p key={reason} className="rounded-2xl bg-slate-100 p-3 text-sm font-bold dark:bg-white/5">{reason}</p>)}</div><div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4"><span className="eyebrow">الحكم النهائي</span><p className="mt-1 font-black leading-7">{buildWeeklyRoast(weekKey, winner.profileId)}</p></div></section>;
}
