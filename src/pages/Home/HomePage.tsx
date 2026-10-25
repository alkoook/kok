import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ChevronLeft, Club, Crown, Gauge, Heart, History, Moon, Settings, Spade, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KokLogo } from '../../components/common/KokLogo';
import { db } from '../../db/database';
import { isFastGame } from '../../games/fast/scoring';
import { aggregatePartnershipScores } from '../../games/trix/scoring';
import { aggregateLikhaTeamScores } from '../../games/likha/engine';
import type { GameSession, GameType } from '../../types';
import { formatDate, GAME_LABELS, isTrix } from '../../utils';

const gameCards: { type: GameType; subtitle: string; icon: typeof Crown; colors: string }[] = [
  { type: 'trix-fast', subtitle: 'Complex + Trix', icon: Gauge, colors: 'from-sky-500/20 to-indigo-500/5 text-sky-600 dark:text-sky-300' },
  { type: 'trix-slow', subtitle: '5 تسميات', icon: Crown, colors: 'from-teal-500/20 to-emerald-500/5 text-teal-600 dark:text-teal-300' },
  { type: 'cc', subtitle: 'لطش + لطش', icon: Club, colors: 'from-rose-500/20 to-orange-500/5 text-rose-600 dark:text-rose-300' },
  { type: 'tarneeb-61', subtitle: 'ضمان من 7 إلى 13', icon: Spade, colors: 'from-violet-500/20 to-fuchsia-500/5 text-violet-600 dark:text-violet-300' },
  { type: 'tarneeb-41', subtitle: 'ضمان فردي', icon: Club, colors: 'from-orange-500/20 to-amber-500/5 text-orange-600 dark:text-orange-300' },
  { type: 'likha', subtitle: 'بنت وكوبا وتدبيل', icon: Heart, colors: 'from-rose-500/20 to-slate-500/5 text-rose-600 dark:text-rose-300' }
];

export function HomePage() {
  const games = useLiveQuery(() => db.games.orderBy('updatedAt').reverse().toArray(), [], []);
  const settings = useLiveQuery(() => db.settings.get('main'));
  const active = games.filter((game) => game.status === 'active');
  const recent = games.slice(0, 4);
  return <main className="page scrollbar-hidden">
    <header className="relative mb-8 flex min-h-52 items-center justify-center pb-5 pt-16"><div className="text-center"><KokLogo variant="hero"/><p className="mt-1 text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">تركس • 61 • طرنيب 41 • ليخة</p></div><div className="absolute inset-inline-end-0 top-2 flex gap-2"><button onClick={() => db.settings.update('main', { theme: document.documentElement.classList.contains('dark') ? 'light' : 'dark' })} className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--text-muted)] shadow-soft" aria-label="تبديل المظهر">{settings?.theme === 'dark' || document.documentElement.classList.contains('dark') ? <Sun size={20}/> : <Moon size={20}/>}</button><Link to="/settings" className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--text-muted)] shadow-soft" aria-label="الإعدادات"><Settings size={21}/></Link></div></header>

    {active.length > 0 && <section className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">أكمل اللعب</h2><span className="eyebrow">محفوظ تلقائيًا</span></div><div className="scrollbar-hidden flex snap-x gap-3 overflow-x-auto pb-2">{active.map((game) => <ActiveGame key={game.id} game={game}/>)}</div></section>}

    <section><div className="mb-3"><span className="eyebrow">اختار لعبتكم</span><h2 className="text-2xl font-black">لعبة جديدة</h2></div><div className="grid grid-cols-2 gap-3">{gameCards.map(({ type, subtitle, icon: Icon, colors }) => <Link key={type} to={`/new/${type}`} className={`group min-h-40 rounded-3xl border border-slate-200/80 bg-gradient-to-br p-4 shadow-soft transition active:scale-[.98] dark:border-white/10 dark:bg-surface ${colors}`}><div className="mb-7 grid size-11 place-items-center rounded-2xl bg-white/75 shadow-sm dark:bg-white/10"><Icon size={22}/></div><h3 className="text-base font-black text-slate-900 dark:text-white">{GAME_LABELS[type]}</h3><p className="mt-1 text-xs font-bold opacity-75">{subtitle}</p></Link>)}</div></section>

    <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">آخر المباريات</h2>{recent.length > 0 && <Link to="/history" className="flex items-center gap-1 text-sm font-bold text-mint-600">عرض الكل <ChevronLeft size={16}/></Link>}</div>{recent.length ? <div className="space-y-3">{recent.map((game) => <Link to={game.status === 'active' ? `/game/${game.id}` : `/details/${game.id}`} key={game.id} className="surface flex items-center gap-3 p-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/5"><History size={19}/></div><div className="min-w-0 flex-1"><strong className="block truncate">{GAME_LABELS[game.gameType]}</strong><span className="muted block truncate text-xs">{game.players.map((player) => player.name).join('، ')}</span></div><div className="text-left"><span className={`text-xs font-bold ${game.status === 'completed' ? 'text-mint-600' : 'text-amber-500'}`}>{game.status === 'completed' ? 'مكتملة' : 'قيد اللعب'}</span><small className="muted block text-[10px]">{formatDate(game.updatedAt)}</small></div></Link>)}</div> : <div className="surface py-9 text-center"><span className="text-3xl">♠</span><p className="muted mt-2">أول مباراة رح تظهر هون.</p></div>}</section>
  </main>;
}

function ActiveGame({ game }: { game: GameSession }) {
  const likhaPartnership = game.gameType === 'likha' && game.likhaMode === 'partnership' && game.teams;
  const displayedScores = likhaPartnership ? aggregateLikhaTeamScores(game.scores, game.teams!) : isTrix(game.gameType) && game.trixMode === 'partnership' && game.teams && !isFastGame(game) ? aggregatePartnershipScores(game.scores, game.teams) : game.scores;
  const scoreIds = likhaPartnership ? game.teams!.map((team) => team.id) : game.gameType === 'likha' || game.rulesSnapshot.kind === 'tarneeb-41-v2' || (isTrix(game.gameType) || game.gameType === 'cc') && game.trixMode !== 'partnership' ? game.players.map((player) => player.id) : game.teams?.map((team) => team.id) ?? game.players.map((player) => player.id);
  return <Link to={`/game/${game.id}`} className="relative min-w-[88%] snap-start overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-xl dark:bg-surface"><div className="absolute -left-8 -top-8 size-28 rounded-full bg-mint-500/15 blur-xl"/><div className="relative"><div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{GAME_LABELS[game.gameType]}</span><span className="text-xs text-white/60">{game.currentRound} جولة</span></div><p className="mt-4 truncate text-sm text-white/70">{game.teams?.map((team) => team.name).join(' ضد ') ?? game.players.map((player) => player.name).join('، ')}</p><div className="my-3 flex gap-4">{scoreIds.map((id) => <strong key={id} className="text-3xl font-black tabular-nums">{displayedScores[id] ?? 0}</strong>)}</div><span className="flex items-center gap-2 font-black text-mint-300">متابعة المباراة <ArrowLeft size={18}/></span></div></Link>;
}
