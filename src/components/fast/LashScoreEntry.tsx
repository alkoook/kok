import { Check, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPartnershipLashInput, createSoloLashInput, lashTotal, LASH_TOTAL, partnershipLashScores } from '../../games/fast/scoring';
import type { GameSession, LashRoundInput } from '../../types';
import { Button } from '../common/Button';
import { PlayerAvatar } from '../common/PlayerAvatar';

type ScoreValue = number | '';

export function LashScoreEntry({ game, initial, onConfirm }: { game: GameSession; initial?: LashRoundInput; onConfirm: (input: LashRoundInput, delta: Record<string, number>) => Promise<void> }) {
  const partnership = game.trixMode === 'partnership' && game.teams?.length === 2;
  const initialTeamScores = initial && game.teams && (initial.kind === 'lash-partnership' || initial.kind === 'lash-partnership-fixed-total') ? partnershipLashScores(initial, game.teams) : undefined;
  const defaultEnteredTeamId = initial?.kind === 'lash-partnership-fixed-total' ? initial.enteredTeamId : game.teams?.[0].id ?? '';
  const [enteredTeamId, setEnteredTeamId] = useState(defaultEnteredTeamId);
  const [enteredScore, setEnteredScore] = useState<ScoreValue>(initial?.kind === 'lash-partnership-fixed-total' ? initial.enteredScore : initialTeamScores?.[defaultEnteredTeamId] ?? '');
  const initialPlayerScores = initial?.kind === 'lash-solo' || initial?.kind === 'lash' ? initial.scoresByPlayer : {};
  const [playerScores, setPlayerScores] = useState<Record<string, ScoreValue>>(Object.fromEntries(game.players.map((player) => [player.id, initialPlayerScores[player.id] ?? ''])));
  const [eater, setEater] = useState(initial?.oldMan.eaterPlayerId ?? '');
  const [doubled, setDoubled] = useState(initial?.oldMan.doubled ?? false);
  const [saving, setSaving] = useState(false);
  const enteredTeam = game.teams?.find((team) => team.id === enteredTeamId);
  const otherTeam = game.teams?.find((team) => team.id !== enteredTeamId);
  const derivedScore = enteredScore === '' ? undefined : LASH_TOTAL - Number(enteredScore);
  const teamScores = enteredScore === '' || !enteredTeam || !otherTeam ? {} : { [enteredTeam.id]: Number(enteredScore), [otherTeam.id]: derivedScore! };
  const normalizedPlayers = useMemo(() => Object.fromEntries(game.players.map((player) => [player.id, Number(playerScores[player.id])])), [game.players, playerScores]);
  const soloTotal = lashTotal(normalizedPlayers);
  const soloComplete = game.players.every((player) => playerScores[player.id] !== '' && Number.isInteger(normalizedPlayers[player.id]));
  const valid = Boolean(eater) && (partnership ? enteredScore !== '' && Number.isInteger(Number(enteredScore)) : soloComplete && soloTotal === LASH_TOTAL);
  const switchEnteredTeam = (teamId: string) => {
    if (teamId === enteredTeamId) return;
    setEnteredScore(derivedScore ?? '');
    setEnteredTeamId(teamId);
  };

  return <div className="space-y-4">
    {partnership ? <>
      <div className="rounded-2xl bg-slate-100 p-3 text-center font-black dark:bg-white/5"><span className="block text-xs">مجموع العقد الثابت</span><strong data-testid="lash-total" className="text-3xl tabular-nums">{LASH_TOTAL}</strong><span className="muted block text-xs">أدخل فريقًا واحدًا فقط، والثاني يُحسب فورًا</span></div>
      <div className="grid grid-cols-2 gap-2">{game.teams!.map((team) => <button key={team.id} type="button" aria-pressed={team.id === enteredTeamId} className={`min-h-12 rounded-2xl border px-2 text-sm font-black ${team.id === enteredTeamId ? 'border-mint-500 bg-mint-500/10 text-mint-700 dark:text-mint-300' : 'border-[var(--border)]'}`} onClick={() => switchEnteredTeam(team.id)}>سجّل لفريق {team.playerIds.map((id) => game.players.find((player) => player.id === id)?.name).join(' + ')}</button>)}</div>
      {enteredTeam && <TeamInputCard game={game} teamId={enteredTeam.id} value={enteredScore} onChange={setEnteredScore}/>}
      {otherTeam && <article data-testid="derived-team-card" className="rounded-3xl border border-dashed border-sky-400/50 bg-sky-500/5 p-4"><span className="eyebrow">الفريق الآخر · محسوب تلقائيًا</span><strong className="mt-1 block">{otherTeam.playerIds.map((id) => game.players.find((player) => player.id === id)?.name).join(' + ')}</strong><b data-testid="derived-team-score" className="mt-2 block text-center text-4xl tabular-nums text-sky-600">{derivedScore ?? '—'}</b><p className="muted mt-1 text-center text-xs">{LASH_TOTAL} - ({enteredScore === '' ? '—' : enteredScore})</p></article>}
    </> : <>
      <div data-testid="lash-total" className={`rounded-2xl p-3 text-center font-black ${soloComplete && soloTotal !== LASH_TOTAL ? 'bg-red-500/10 text-red-600 ring-2 ring-red-400/30' : 'bg-slate-100 dark:bg-white/5'}`}><span className="block text-xs">المجموع الحالي</span><strong className="text-3xl tabular-nums">{soloTotal}</strong><span className="muted block text-xs">المطلوب: {LASH_TOTAL}</span>{soloComplete && soloTotal !== LASH_TOTAL && <small className="block">الفرق: {LASH_TOTAL - soloTotal}</small>}</div>
      <div className="grid grid-cols-2 gap-3">{game.players.map((player) => <ScoreInputCard key={player.id} id={player.id} name={player.name} value={playerScores[player.id]} testId="player-lash-input" onChange={(value) => setPlayerScores((current) => ({ ...current, [player.id]: value }))}/>)}</div>
    </>}
    <section className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><h3 className="font-black">مين أكل الختيار؟</h3><div className="mt-2 grid grid-cols-2 gap-2">{game.players.map((player) => <button type="button" key={player.id} className={`min-h-11 rounded-xl font-bold ${eater === player.id ? 'bg-orange-500 text-white' : 'bg-[var(--surface)]'}`} onClick={() => setEater(player.id)}>{player.name}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={`min-h-11 rounded-xl font-bold ${!doubled ? 'bg-mint-500 text-white' : 'bg-[var(--surface)]'}`} onClick={() => setDoubled(false)}>مو مدبل</button><button type="button" className={`min-h-11 rounded-xl font-bold ${doubled ? 'bg-orange-500 text-white' : 'bg-[var(--surface)]'}`} onClick={() => setDoubled(true)}>مدبل</button></div></section>
    <Button className="w-full" size="lg" disabled={!valid || saving} icon={<Check/>} onClick={async () => {
      setSaving(true);
      try {
        const oldMan = { eaterPlayerId: eater, doubled };
        const input = partnership ? createPartnershipLashInput(enteredTeamId, Number(enteredScore), oldMan, LASH_TOTAL) : createSoloLashInput(normalizedPlayers, oldMan);
        await onConfirm(input, partnership ? teamScores : normalizedPlayers);
      } finally { setSaving(false); }
    }}>حفظ اللطش</Button>
  </div>;
}

function TeamInputCard({ game, teamId, value, onChange }: { game: GameSession; teamId: string; value: ScoreValue; onChange: (value: ScoreValue) => void }) {
  const team = game.teams!.find((candidate) => candidate.id === teamId)!;
  const name = team.playerIds.map((id) => game.players.find((player) => player.id === id)?.name).join(' + ');
  return <article className="rounded-3xl border border-mint-500/50 p-4 ring-1 ring-mint-500/20"><div className="flex items-center justify-between gap-2"><div><span className="eyebrow">النتيجة التي تدخلها</span><strong className="block">{name}</strong></div><div className="flex -space-x-2 space-x-reverse">{team.playerIds.map((id) => { const player = game.players.find((candidate) => candidate.id === id)!; return <PlayerAvatar key={id} name={player.name} size="sm"/>; })}</div></div><ScoreControls id={team.id} name={name} value={value} testId="team-lash-input" onChange={onChange}/></article>;
}

function ScoreInputCard({ id, name, value, testId, onChange }: { id: string; name: string; value: ScoreValue; testId: string; onChange: (value: ScoreValue) => void }) {
  return <article className="rounded-3xl border border-[var(--border)] p-3 focus-within:border-mint-500"><span className="eyebrow">نتيجة اللاعب</span><strong className="block truncate">{name}</strong><ScoreControls id={id} name={name} value={value} testId={testId} onChange={onChange}/></article>;
}

function ScoreControls({ id, name, value, testId, onChange }: { id: string; name: string; value: ScoreValue; testId: string; onChange: (value: ScoreValue) => void }) {
  const adjust = (amount: number) => onChange(Number(value || 0) + amount);
  return <><input data-testid={testId} data-score-id={id} aria-label={`نتيجة ${name}`} className={`my-2 w-full rounded-2xl bg-slate-100 px-2 py-3 text-center text-4xl font-black tabular-nums outline-none dark:bg-white/5 ${Number(value) > 0 ? 'text-mint-600' : Number(value) < 0 ? 'text-red-500' : ''}`} type="number" inputMode="numeric" placeholder="0" value={value} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}/><div className="grid grid-cols-2 gap-2"><button type="button" aria-label={`ناقص 5 ${name}`} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-red-500/10 font-black text-red-600 active:scale-95" onClick={() => adjust(-5)}><Minus size={18}/>-5</button><button type="button" aria-label={`زائد 5 ${name}`} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-mint-500/10 font-black text-mint-700 active:scale-95 dark:text-mint-300" onClick={() => adjust(5)}><Plus size={18}/>+5</button></div></>;
}
