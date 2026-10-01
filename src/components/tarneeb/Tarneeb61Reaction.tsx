import { CircleAlert, Crown, Flame, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import type { Tarneeb61Reaction as Reaction } from '../../games/tarneeb/reactions';

type Props = { reaction: Reaction; onDismiss: () => void };

const variantStyles: Record<Reaction['variant'], string> = {
  success: 'reaction-toast--success border-emerald-400/55 text-slate-950 dark:border-emerald-400/45 dark:text-slate-50',
  failure: 'reaction-toast--failure border-rose-400/55 text-slate-950 dark:border-rose-400/45 dark:text-slate-50',
  kaboot: 'reaction-toast--kaboot border-amber-400/70 text-slate-950 dark:border-amber-300/60 dark:text-amber-50',
  'broken-seven': 'reaction-toast--broken-seven border-orange-700/60 text-slate-950 dark:border-orange-500/55 dark:text-slate-50'
};

function ReactionIcon({ variant }: { variant: Reaction['variant'] }) {
  const badgeClass = variant === 'kaboot'
    ? 'border-amber-400/35 bg-amber-400/15 text-amber-600 dark:text-amber-300'
    : variant === 'success'
      ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-600 dark:text-emerald-300'
      : variant === 'broken-seven'
        ? 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300'
        : 'border-rose-400/30 bg-rose-400/15 text-rose-600 dark:text-rose-300';
  const icon = variant === 'kaboot' ? <Crown size={22}/> : variant === 'success' ? <Trophy size={20}/> : variant === 'broken-seven' ? <Flame size={20}/> : <CircleAlert size={20}/>;
  return <span className={`reaction-icon grid size-10 shrink-0 place-items-center rounded-xl border ${badgeClass}`} aria-hidden="true">{icon}</span>;
}

export function Tarneeb61Reaction({ reaction, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingMs = useRef(reaction.durationMs);
  const startedAt = useRef(0);
  const dismissTimer = useRef<number | undefined>(undefined);
  const exitTimer = useRef<number | undefined>(undefined);
  const touchStart = useRef<{ x: number; y: number } | undefined>(undefined);

  const dismiss = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    window.clearTimeout(dismissTimer.current);
    exitTimer.current = window.setTimeout(onDismiss, 200);
  }, [exiting, onDismiss]);

  useEffect(() => {
    if (paused || exiting) return;
    startedAt.current = performance.now();
    dismissTimer.current = window.setTimeout(dismiss, remainingMs.current);
    return () => {
      window.clearTimeout(dismissTimer.current);
      remainingMs.current = Math.max(0, remainingMs.current - (performance.now() - startedAt.current));
    };
  }, [dismiss, exiting, paused]);

  useEffect(() => () => {
    window.clearTimeout(dismissTimer.current);
    window.clearTimeout(exitTimer.current);
  }, []);

  const finishSwipe = (event: TouchEvent) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = undefined;
    if (start && (Math.abs(touch.clientX - start.x) > 48 || Math.abs(touch.clientY - start.y) > 48)) dismiss();
  };

  const isLong = reaction.variant === 'broken-seven';
  return <div className={`reaction-layer pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3 sm:px-4 ${exiting ? 'reaction-layer--out' : ''}`} role={isLong ? 'note' : 'status'} aria-live={isLong ? 'off' : 'polite'} dir="rtl">
    <section
      className={`reaction-toast pointer-events-auto relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#fffefa] to-slate-100 dark:from-[#181d28] dark:to-[#0d1119] ${variantStyles[reaction.variant]} ${isLong ? 'w-full max-h-[min(54dvh,30rem)] max-w-[560px] overflow-y-auto px-4 py-4 pe-12 text-sm font-bold leading-7 sm:px-[18px] sm:text-[15px]' : 'min-h-16 w-fit max-w-[420px] px-[18px] py-3.5 pe-12 text-base font-black leading-7'}`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={finishSwipe}
    >
      <button type="button" className={`absolute end-2 top-2 grid size-9 place-items-center rounded-xl border border-slate-900/5 bg-slate-900/5 text-slate-600 transition hover:bg-slate-900/10 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 ${isLong ? 'shadow-sm' : ''}`} onClick={dismiss} aria-label="إغلاق التعليق"><X size={17}/></button>
      <div className={`flex gap-3.5 ${isLong ? 'items-start' : 'items-center'}`}>
        <ReactionIcon variant={reaction.variant}/>
        <div className="min-w-0">{reaction.badge && <span className="mb-1 inline-flex rounded-full border border-amber-400/25 bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-black text-amber-700 tabular-nums dark:text-amber-200">{reaction.badge}</span>}<p className="text-wrap">{reaction.message}</p></div>
      </div>
      <span className="reaction-progress absolute inset-x-0 bottom-0 h-[3px] origin-right bg-current opacity-35" style={{ animationDuration: `${reaction.durationMs}ms`, animationPlayState: paused ? 'paused' : 'running' }} aria-hidden="true"/>
    </section>
  </div>;
}
