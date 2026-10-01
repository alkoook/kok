import { aggregatePartnershipScores } from '../../games/trix/scoring';
import type { GamePlayer, GameTeam, TrixMode } from '../../types';

export function TrixScoreboard({ players, scores, ownerId, mode, teams }: { players: GamePlayer[]; scores: Record<string, number>; ownerId?: string; mode?: TrixMode; teams?: GameTeam[] }) {
  if (mode === 'partnership' && teams) {
    const teamScores = aggregatePartnershipScores(scores, teams);
    return <div className="surface overflow-hidden"><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-gradient-to-br from-mint-500/10 to-sky-500/10 p-5">{teams.map((team, index) => <div key={team.id} className={index === 1 ? 'col-start-3 text-left' : ''}><span className="block truncate text-sm font-black">{team.name}</span><small className="muted block truncate text-[10px]">{team.playerIds.map((id) => players.find((player) => player.id === id)?.name).join(' + ')}</small><strong className="mt-1 block text-4xl font-black tabular-nums">{teamScores[team.id]}</strong>{team.playerIds.includes(ownerId ?? '') && <span className="text-[10px] font-bold text-mint-600">فريق صاحب المملكة</span>}</div>)}<span className="col-start-2 row-start-1 text-xs font-bold text-slate-400">ضد</span></div></div>;
  }
  const leader = Math.max(...players.map((player) => scores[player.id] ?? 0));
  return <div className="surface grid grid-cols-2 gap-px overflow-hidden bg-slate-200 p-0 dark:bg-white/10">
    {players.map((player) => { const score = scores[player.id] ?? 0; return <div key={player.id} className={`relative bg-white p-4 dark:bg-surface ${ownerId === player.id ? 'ring-2 ring-inset ring-mint-500' : ''}`}>
      <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold">{player.name}</span>{score === leader && <span className="text-xs" aria-label="المتصدر">●</span>}</div>
      <div className={`mt-1 text-3xl font-black tabular-nums ${score < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{score}</div>
      {ownerId === player.id && <span className="mt-1 block text-[11px] font-bold text-mint-600 dark:text-mint-400">صاحب المملكة</span>}
    </div>; })}
  </div>;
}
