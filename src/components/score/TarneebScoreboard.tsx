import type { GameTeam } from '../../types';

export function TarneebScoreboard({ teams, scores, target }: { teams: GameTeam[]; scores: Record<string, number>; target: number }) {
  return <div className="surface p-4">
    <div className="mb-3 flex items-center justify-between"><span className="eyebrow">النتيجة</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-white/10">الهدف: {target}</span></div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      {teams.map((team, index) => <div key={team.id} className={index === 1 ? 'col-start-3 text-left' : ''}>
        <div className="truncate text-sm font-bold">{team.name}</div>
        <div className="text-4xl font-black tabular-nums">{scores[team.id] ?? 0}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-mint-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, ((scores[team.id] ?? 0) / target) * 100))}%` }}/></div>
      </div>)}
      <span className="col-start-2 row-start-1 text-xs font-black text-slate-300">ضد</span>
    </div>
  </div>;
}
