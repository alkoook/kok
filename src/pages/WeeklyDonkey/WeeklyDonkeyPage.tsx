import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Send, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/toast-context';
import { db } from '../../db/database';
import { calculateWeeklyCourt } from '../../features/weekly/calculateWeeklyCourt';
import { getLocalWeekBounds, shiftLocalWeek } from '../../features/weekly/weekWindow';
import { buildWeeklyRoast, buildWeeklySubtitle } from '../../features/weekly-donkey/buildWeeklyRoast';
import type { WeeklyPlayerStats } from '../../features/weekly-donkey/calculateWeeklyDonkey';
import { buildWeeklyHeroLine } from '../../features/weekly-hero/buildWeeklyHeroLine';
import type { WeeklyHeroPlayerStats } from '../../features/weekly-hero/calculateWeeklyHero';
import { enqueueManualWeeklyReport } from '../../telegram/weeklyReports';
import { flushTelegramOutbox } from '../../telegram/outbox';

type WeeklyTab = 'hero' | 'donkey';

const dateTimeLabel = (date: Date) => new Intl.DateTimeFormat('ar-SY', { weekday: 'short', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(date);

export function WeeklyDonkeyPage() {
  const games = useLiveQuery(() => db.games.toArray(), [], []);
  const rounds = useLiveQuery(() => db.rounds.toArray(), [], []);
  const settings = useLiveQuery(() => db.settings.get('main'));
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<WeeklyTab>('hero');
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const refreshClock = () => setClock(Date.now());
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshClock(); };
    window.addEventListener('focus', refreshClock);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('focus', refreshClock); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const current = useMemo(() => getLocalWeekBounds(new Date(clock)), [clock]);
  const bounds = useMemo(() => shiftLocalWeek(current, offset), [current, offset]);
  const court = useMemo(() => calculateWeeklyCourt(games, rounds, bounds), [bounds, games, rounds]);
  const range = `${dateTimeLabel(bounds.start)} ← ${dateTimeLabel(bounds.endExclusive)}`;
  const heroIds = court.hero.winners.map((winner) => winner.profileId);
  const donkeyIds = court.donkey.winners.map((winner) => winner.profileId);
  const sameWinner = heroIds.length === 1 && donkeyIds.length === 1 && heroIds[0] === donkeyIds[0];

  const share = async () => {
    const winners = tab === 'hero' ? court.hero.winners : court.donkey.winners;
    if (!winners.length) return;
    const title = tab === 'hero' ? (winners.length > 1 ? 'أبطال الأسبوع' : 'بطل الأسبوع') : (winners.length > 1 ? 'حمير الأسبوع' : 'حمار الأسبوع');
    const summary = tab === 'hero' ? buildWeeklyHeroLine(bounds.key, winners.map((winner) => winner.profileId).join('-')) : buildWeeklyRoast(bounds.key, winners.map((winner) => winner.profileId).join('-'));
    const text = `${tab === 'hero' ? '👑' : '🐴'} ${title}\n${winners.map((winner) => winner.name).join(' و ')}\n${winners.flatMap((winner) => winner.reasons.slice(0, 3)).join('\n')}\n${summary}\n${range}`;
    try {
      if (navigator.share) await navigator.share({ title: `KOK — ${title}`, text });
      else { await navigator.clipboard.writeText(text); toast('تم نسخ البطاقة للمشاركة'); }
    } catch { /* user cancelled */ }
  };
  const sendTelegram = async (mode: 'hero' | 'donkey' | 'combined') => {
    if (!settings?.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) { toast('أكمل إعداد Telegram أولاً من صفحة الإعدادات.'); return; }
    await enqueueManualWeeklyReport(bounds, mode);
    const result = await flushTelegramOutbox({ force: true });
    toast(result.sent ? 'تم إرسال تقرير الأسبوع إلى Telegram' : result.configError ?? 'حُفظ التقرير في طابور Telegram');
  };

  return <main className="page">
    <header className="mb-4"><span className="eyebrow">محكمة الأرقام الأسبوعية</span><h1 className="text-3xl font-black">أبطال وحمير</h1><p className="muted mt-1 text-sm">حكمان من نتائج اللعب الحقيقية، بلا تصويت ولا اختيار عشوائي.</p></header>
    <section className="surface mb-4 p-4 text-center"><span className="eyebrow">{offset === 0 ? 'الأسبوع الحالي' : 'أسبوع سابق'}</span><p className="mt-1 text-sm font-black leading-6">{range}</p><p className="muted mt-1 text-xs">صافرة البداية والنهاية: السبت 10:00 صباحاً بالتوقيت المحلي</p></section>
    <div className="mb-4 grid grid-cols-[3rem_1fr_3rem] items-center gap-2"><button className="grid size-12 place-items-center rounded-2xl bg-[var(--surface)]" onClick={() => setOffset((value) => value - 1)} aria-label="الأسبوع السابق"><ChevronRight/></button><button className="min-h-12 rounded-2xl bg-[var(--surface)] px-3 text-sm font-black" onClick={() => { setClock(Date.now()); setOffset(0); }}>{offset === 0 ? 'تحديث الأسبوع الحالي' : 'العودة للأسبوع الحالي'}</button><button className="grid size-12 place-items-center rounded-2xl bg-[var(--surface)] disabled:opacity-30" disabled={offset >= 0} onClick={() => setOffset((value) => value + 1)} aria-label="الأسبوع التالي"><ChevronLeft/></button></div>
    <div className="mb-4 grid grid-cols-2 rounded-2xl bg-slate-200/70 p-1 dark:bg-white/5" role="tablist" aria-label="حكم الأسبوع"><button role="tab" aria-selected={tab === 'hero'} className={`min-h-12 rounded-xl px-2 text-sm font-black transition ${tab === 'hero' ? 'bg-[var(--surface)] text-amber-600 shadow-sm dark:text-amber-300' : 'muted'}`} onClick={() => setTab('hero')}>👑 البطل</button><button role="tab" aria-selected={tab === 'donkey'} className={`min-h-12 rounded-xl px-2 text-sm font-black transition ${tab === 'donkey' ? 'bg-[var(--surface)] text-rose-700 shadow-sm dark:text-rose-300' : 'muted'}`} onClick={() => setTab('donkey')}>🐴 الحمار</button></div>
    {sameWinner && <p className="mb-4 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-3 text-center text-sm font-black">جمع لقبي بطل الأسبوع وحمار الأسبوع في الوقت نفسه.</p>}
    {tab === 'hero' ? <HeroPanel winners={court.hero.winners} weekKey={bounds.key} range={range}/> : <DonkeyPanel winners={court.donkey.winners} weekKey={bounds.key} range={range}/>}
    {(tab === 'hero' ? court.hero.winners.length : court.donkey.winners.length) > 0 && <Button className="mt-4 w-full" variant="secondary" icon={<Share2 size={18}/>} onClick={share}>شارك البطاقة</Button>}
    <section className="surface mt-4 p-3"><span className="eyebrow">Telegram</span><div className="mt-2 grid gap-2"><Button size="sm" variant="secondary" icon={<Send size={16}/>} disabled={tab === 'hero' ? !court.hero.winners.length : !court.donkey.winners.length} onClick={() => sendTelegram(tab)}>{tab === 'hero' ? 'إرسال بطل الأسبوع إلى Telegram' : 'إرسال حمار الأسبوع إلى Telegram'}</Button><Button size="sm" icon={<Send size={16}/>} disabled={!court.hero.winners.length && !court.donkey.winners.length} onClick={() => sendTelegram('combined')}>إرسال نتيجة الأسبوع</Button></div></section>
  </main>;
}

function HeroPanel({ winners, weekKey, range }: { winners: WeeklyHeroPlayerStats[]; weekKey: string; range: string }) {
  if (!winners.length) return <Empty icon="👑" title="لسا ما حدا استحق التاج."/>;
  const title = winners.length > 1 ? 'أبطال الأسبوع' : 'بطل الأسبوع';
  const seed = winners.map((winner) => winner.profileId).join('-');
  return <><section className="weekly-donkey-card relative overflow-hidden rounded-[2rem] border border-amber-300/40 bg-gradient-to-br from-[#2a210d] via-[#17150f] to-[#0d1118] p-6 text-white shadow-2xl"><div className="absolute -left-12 -top-12 size-48 rounded-full bg-amber-300/15 blur-3xl"/><div className="relative"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-black text-amber-300">بطاقة الهيبة</span><h2 className="mt-1 text-3xl font-black">👑 {title}</h2></div><div className="hero-crown grid size-16 shrink-0 place-items-center rounded-full border-2 border-amber-300/50 bg-amber-300/10 text-3xl">👑</div></div><p className="mt-5 text-lg font-bold text-slate-100">{buildWeeklyHeroLine(weekKey, seed)}</p><div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5"><span className="text-xs text-slate-400">صاحب التاج</span><strong className="mt-1 block break-words text-4xl font-black text-amber-300">{winners.map((winner) => winner.name).join(' و ')}</strong><span className="mt-2 block text-xs leading-5 text-slate-400">مدة الحكم: هذا الأسبوع · {range}</span></div></div></section><div className="mt-4 space-y-4">{winners.map((winner) => <HeroEvidence key={winner.profileId} winner={winner} weekKey={weekKey}/>)}</div></>;
}

function DonkeyPanel({ winners, weekKey, range }: { winners: WeeklyPlayerStats[]; weekKey: string; range: string }) {
  if (!winners.length) return <Empty icon="🐴" title="لسا ما حدا سجل تعثرات كافية."/>;
  const title = winners.length > 1 ? 'حمير الأسبوع' : 'حمار الأسبوع';
  const seed = winners.map((winner) => winner.profileId).join('-');
  return <><section className="weekly-donkey-card relative overflow-hidden rounded-[2rem] border border-rose-900/50 bg-gradient-to-br from-[#24120f] via-[#18100e] to-[#0d1118] p-6 text-white shadow-2xl"><div className="absolute -left-10 -top-10 size-40 rounded-full bg-rose-800/15 blur-3xl"/><div className="relative"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-black text-rose-300">بطاقة نتائج الأسبوع</span><h2 className="mt-1 text-3xl font-black">🐴 {title}</h2></div><div className="donkey-seal grid size-16 shrink-0 place-items-center rounded-full border-2 border-rose-300/40 bg-rose-300/10 text-3xl">🐴</div></div><p className="mt-5 text-lg font-bold text-slate-200">{buildWeeklySubtitle(weekKey, seed)}</p><div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5"><span className="text-xs text-slate-400">صاحب البطاقة</span><strong className="mt-1 block break-words text-4xl font-black text-rose-300">{winners.map((winner) => winner.name).join(' و ')}</strong><span className="mt-2 block text-xs leading-5 text-slate-400">مدة الحكم: هذا الأسبوع · {range}</span></div></div></section><div className="mt-4 space-y-4">{winners.map((winner) => <DonkeyEvidence key={winner.profileId} winner={winner} weekKey={weekKey}/>)}</div></>;
}

function HeroEvidence({ winner, weekKey }: { winner: WeeklyHeroPlayerStats; weekKey: string }) {
  return <section className="surface p-5"><span className="eyebrow">تقرير الهيبة · {winner.completedGames} قعدات مكتملة</span><h2 className="mt-1 text-xl font-black">ليش التاج لـ{winner.name}؟</h2>{winner.awards.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{winner.awards.map((award) => <span key={award} className="rounded-full bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-700 dark:text-amber-300">{award}</span>)}</div>}<div className="mt-4 space-y-2">{winner.reasons.map((reason) => <p key={reason} className="rounded-2xl bg-amber-500/10 p-3 text-sm font-bold">{reason}</p>)}</div><div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4"><span className="eyebrow">الحكم النهائي</span><p className="mt-1 font-black leading-7">{buildWeeklyHeroLine(weekKey, winner.profileId)}</p></div></section>;
}

function DonkeyEvidence({ winner, weekKey }: { winner: WeeklyPlayerStats; weekKey: string }) {
  return <section className="surface p-5"><span className="eyebrow">تقرير التعثرات · {winner.completedGames} قعدات مكتملة</span><h2 className="mt-1 text-xl font-black">لماذا حصل {winner.name} على البطاقة؟</h2><div className="mt-4 space-y-2">{winner.reasons.map((reason) => <p key={reason} className="rounded-2xl bg-slate-100 p-3 text-sm font-bold dark:bg-white/5">{reason}</p>)}</div><div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4"><span className="eyebrow">التقييم النهائي</span><p className="mt-1 font-black leading-7">{buildWeeklyRoast(weekKey, winner.profileId)}</p></div></section>;
}

function Empty({ icon, title }: { icon: string; title: string }) {
  return <section className="surface py-16 text-center"><div className="text-6xl">{icon}</div><h2 className="mt-4 text-xl font-black">{title}</h2><p className="muted mx-auto mt-2 max-w-sm text-sm">يلزم كل مرشح قعدتين مكتملتين على الأقل ضمن نافذة الأسبوع.</p></section>;
}
