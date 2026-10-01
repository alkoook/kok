import { useLiveQuery } from 'dexie-react-hooks';
import { Award, Crown, Flame, Share2, Sparkles, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../db/database';
import { shareFastGame } from '../../games/fast/shareCard';
import { buildFastSessionSummary, readSummaryHistory, rememberSummary } from '../../games/fast/summary';
import { effectiveSummaryContent } from '../../games/fast/summaryContent';
import type { GameRound, GameSession } from '../../types';
import { scoreText } from '../../utils';
import { Button } from '../common/Button';
import { PlayerAvatar } from '../common/PlayerAvatar';

export function FastSessionSummary({ game, rounds }: { game: GameSession; rounds: GameRound[] }) {
  const overrides = useLiveQuery(() => db.contentOverrides.toArray(), [], []);
  const profiles = useLiveQuery(() => db.players.bulkGet(game.players.map((player) => player.profileId).filter((id): id is string => Boolean(id))), [game.id], []);
  const content = useMemo(() => effectiveSummaryContent(overrides), [overrides]);
  const [recent] = useState(readSummaryHistory);
  const summary = useMemo(() => { const otherGames = recent.filter((entry) => entry.gameId !== game.id); return buildFastSessionSummary(game, rounds, content.segments, content.titles, otherGames.map((entry) => entry.signature), otherGames.flatMap((entry) => entry.titleIds)); }, [content, game, recent, rounds]);
  useEffect(() => rememberSummary(summary), [summary]);
  const profileForPlayer = (playerId: string) => profiles.find((profile) => profile?.id === game.players.find((player) => player.id === playerId)?.profileId);
  return <div className="space-y-5 pb-8">
    <section className="surface match-finish overflow-hidden text-center"><div className="bg-gradient-to-b from-amber-400/20 to-transparent p-6"><Crown className="mx-auto text-amber-500" size={50}/><span className="eyebrow">ملخص القعدة</span><h1 className="mt-1 text-3xl font-black">{summary.standings.filter((entry) => summary.winnerIds.includes(entry.id)).map((entry) => entry.name).join(' و ')}</h1><p className="muted">الفارق {summary.margin}</p></div><div className={`mx-4 mb-5 grid gap-2 ${summary.standings.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>{summary.standings.map((entry, index) => { const playerIds = game.teams?.find((team) => team.id === entry.id)?.playerIds ?? [entry.id]; return <article key={entry.id} className={`rounded-2xl p-3 ${index === 0 ? 'bg-amber-400/15 ring-1 ring-amber-400/40' : 'bg-slate-100 dark:bg-white/5'}`}><div className="mb-2 flex justify-center -space-x-2 space-x-reverse">{playerIds.map((playerId) => { const player = game.players.find((item) => item.id === playerId); return player && <PlayerAvatar key={playerId} name={player.name} photo={profileForPlayer(playerId)?.photo} size="sm"/>; })}</div><span className="text-xs font-black">{entry.name}</span><strong className="block text-2xl tabular-nums">{scoreText(entry.score)}</strong></article>; })}</div></section>
    <section className="surface p-5"><div className="mb-3 flex items-center gap-2"><Sparkles className="text-violet-500"/><h2 className="text-xl font-black">حكاية القعدة</h2></div><div className="space-y-2">{summary.story.map((line, index) => <p key={`${summary.signature}-${index}`} className="rounded-2xl bg-slate-100 p-3 text-sm font-bold leading-7 dark:bg-white/5">{line}</p>)}</div></section>
    <div className="grid gap-4 sm:grid-cols-2"><SummaryList icon={<Star/>} title="نجوم القعدة" tone="star" rows={summary.stars}/><SummaryList icon={<Flame/>} title="مسخرة القعدة" tone="roast" rows={summary.roasts}/></div>
    <section><div className="mb-3 flex items-center gap-2"><Award className="text-amber-500"/><h2 className="text-xl font-black">الألقاب الرسمية لليلة</h2></div><div className="grid grid-cols-2 gap-2">{summary.titles.map((title) => <article className="surface p-4" key={title.id}><span className="eyebrow">{title.title}</span><strong className="mt-1 block">{title.subject}</strong></article>)}</div></section>
    <section><h2 className="mb-3 text-xl font-black">الممالك الأربع</h2><div className="space-y-3">{summary.kingdoms.map((kingdom) => <details className="surface p-4" key={kingdom.index} open={kingdom.index === 0}><summary className="cursor-pointer font-black">المملكة {kingdom.index + 1} · {kingdom.ownerName}</summary><div className="mt-3 space-y-3"><div><span className="eyebrow">اللطش الخام</span>{kingdom.lash.map((entry) => <p className="flex justify-between text-sm" key={entry.id}><span>{entry.name}</span><b>{scoreText(entry.score)}</b></p>)}</div>{kingdom.trixOrder && <div><span className="eyebrow">ترتيب التركس</span>{kingdom.trixOrder.map((entry, index) => <p className="flex justify-between text-sm" key={entry.id}><span>{index + 1}. {entry.name}</span><b>{entry.score}</b></p>)}</div>}<div><span className="eyebrow">دلتا المملكة</span>{kingdom.delta.map((entry) => <p className="flex justify-between text-sm" key={entry.id}><span>{entry.name}</span><b>{scoreText(entry.score)}</b></p>)}</div>{kingdom.oldMen.map((oldMan, index) => <div key={`${oldMan.playerId}-${index}`} className="flex items-center gap-2 rounded-xl bg-orange-500/10 p-2"><PlayerAvatar name={oldMan.playerName} photo={profileForPlayer(oldMan.playerId)?.photo} size="sm"/><span className="text-xs font-black">{oldMan.playerName} أكل الختيار · {oldMan.doubled ? 'مدبل' : 'مو مدبل'}</span></div>)}</div></details>)}</div></section>
    <div className="grid gap-2"><Button icon={<Share2/>} onClick={() => shareFastGame(game, profiles.filter(Boolean), summary)}>مشاركة بطاقة القعدة</Button><Link className="flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 font-bold dark:bg-white/10" to={`/details/${game.id}`}>النتائج الخام</Link><Link className="flex min-h-12 items-center justify-center font-bold text-slate-500" to="/">الرئيسية</Link></div>
  </div>;
}

function SummaryList({ icon, title, tone, rows }: { icon: ReactNode; title: string; tone: 'star' | 'roast'; rows: string[] }) { return <section className={`rounded-3xl border p-5 ${tone === 'star' ? 'border-amber-400/30 bg-amber-400/10' : 'border-rose-400/30 bg-rose-500/10'}`}><div className="mb-3 flex items-center gap-2">{icon}<h2 className="font-black">{title}</h2></div>{rows.length ? <div className="space-y-2">{rows.map((row) => <p key={row} className="text-sm font-bold leading-6">{row}</p>)}</div> : <p className="muted text-sm">ما في بيانات كافية لهالقسم.</p>}</section>; }
