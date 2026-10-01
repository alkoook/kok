import type { GamePlayer, GameTeam } from '../../types';

export function Tarneeb41Scoreboard({ players, teams, scores }: { players: GamePlayer[]; teams: GameTeam[]; scores: Record<string, number> }) {
  return <div className="surface grid grid-cols-4 gap-px overflow-hidden bg-[var(--border)] p-0">{players.map((player) => {
    const team = teams.find((item) => item.playerIds.includes(player.id));
    return <div key={player.id} className="bg-[var(--surface)] p-2 text-center" title={team?.name}><span className="block truncate text-xs font-bold">{player.name}</span><strong className={`block text-2xl tabular-nums ${(scores[player.id] ?? 0) < 0 ? 'text-red-500' : ''}`}>{scores[player.id] ?? 0}</strong><small className="muted block truncate text-[10px]">{team?.name}</small></div>;
  })}</div>;
}
