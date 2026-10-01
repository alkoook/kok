import { Check, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { GameSession, LashRoundInput } from '../../types';
import { createPartnershipLashInput, createSoloLashInput, lashTotal, LASH_TOTAL } from '../../games/fast/scoring';
import { Button } from '../common/Button';
import { PlayerAvatar } from '../common/PlayerAvatar';

type ScoreValue = number | '';

export function LashScoreEntry({ game, initial, onConfirm }: { game: GameSession; initial?: LashRoundInput; onConfirm: (input: LashRoundInput, delta: Record<string, number>) => Promise<void> }) {
  const partnership = game.trixMode === 'partnership' && Boolean(game.teams?.length);
  const entities = partnership
    ? game.teams!.map((team) => ({ id: team.id, name: team.name, playerIds: team.playerIds }))
    : game.players.map((player) => ({ id: player.id, name: player.name, playerIds: [player.id] }));
  const initialScores = initial?.kind === 'lash-partnership' ? initial.scoresByTeam : initial?.kind === 'lash-solo' || initial?.kind === 'lash' ? initial.scoresByPlayer : {};
  const [scores, setScores] = useState<Record<string, ScoreValue>>(Object.fromEntries(entities.map((entity) => [entity.id, initialScores[entity.id] ?? ''])));
  const [eater, setEater] = useState(initial?.oldMan.eaterPlayerId ?? '');
  const [doubled, setDoubled] = useState(initial?.oldMan.doubled ?? false);
  const [saving, setSaving] = useState(false);
  const normalized = useMemo(() => Object.fromEntries(entities.map((entity) => [entity.id, Number(scores[entity.id])])), [entities, scores]);
  const total = lashTotal(normalized);
  const complete = entities.every((entity) => scores[entity.id] !== '' && Number.isInteger(normalized[entity.id]));
  const valid = complete && total === LASH_TOTAL && Boolean(eater);
  const difference = LASH_TOTAL - total;
  const adjust = (id: string, amount: number) => setScores((current) => ({ ...current, [id]: Number(current[id] || 0) + amount }));

  return <div className="space-y-4">
    <div data-testid="lash-total" className={`rounded-2xl p-3 text-center font-black ${complete && total !== LASH_TOTAL ? 'bg-red-500/10 text-red-600 ring-2 ring-red-400/30' : 'bg-slate-100 dark:bg-white/5'}`}>
      <span className="block text-xs">المجموع الحالي</span><strong className="text-3xl tabular-nums">{total}</strong><span className="muted block text-xs">المطلوب: -500</span>
      {complete && total !== LASH_TOTAL && <small className="block">الفرق: {difference}</small>}
    </div>
    <div className={`grid gap-3 ${partnership ? 'grid-cols-1' : 'grid-cols-2'}`}>{entities.map((entity) => {
      const value = scores[entity.id];
      const members = entity.playerIds.map((id) => game.players.find((player) => player.id === id)).filter(Boolean);
      return <article key={entity.id} className={`rounded-3xl border p-3 transition ${complete && total !== LASH_TOTAL ? 'border-red-400/60' : 'border-[var(--border)] focus-within:border-mint-500'}`}>
        <div className="flex items-center justify-between gap-2"><div className="min-w-0"><span className="eyebrow">{partnership ? 'نتيجة الفريق' : 'نتيجة اللاعب'}</span><strong className="block truncate">{partnership ? members.map((member) => member?.name).join(' + ') : entity.name}</strong></div><div className="flex -space-x-2 space-x-reverse">{members.map((member) => member && <PlayerAvatar key={member.id} name={member.name} size="sm"/>)}</div></div>
        <input data-testid={partnership ? 'team-lash-input' : 'player-lash-input'} aria-label={`نتيجة ${entity.name}`} className={`my-2 w-full rounded-2xl bg-slate-100 px-2 py-3 text-center text-4xl font-black tabular-nums outline-none dark:bg-white/5 ${Number(value) > 0 ? 'text-mint-600' : Number(value) < 0 ? 'text-red-500' : ''}`} type="number" inputMode="numeric" placeholder="0" value={value} onChange={(event) => setScores((current) => ({ ...current, [entity.id]: event.target.value === '' ? '' : Number(event.target.value) }))}/>
        <div className="grid grid-cols-2 gap-2"><button type="button" aria-label={`ناقص 5 ${entity.name}`} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-red-500/10 font-black text-red-600 active:scale-95" onClick={() => adjust(entity.id, -5)}><Minus size={18}/>-5</button><button type="button" aria-label={`زائد 5 ${entity.name}`} className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-mint-500/10 font-black text-mint-700 active:scale-95 dark:text-mint-300" onClick={() => adjust(entity.id, 5)}><Plus size={18}/>+5</button></div>
      </article>;
    })}</div>
    <section className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><h3 className="font-black">مين أكل الختيار؟</h3><div className="mt-2 grid grid-cols-2 gap-2">{game.players.map((player) => <button type="button" key={player.id} className={`min-h-11 rounded-xl font-bold ${eater === player.id ? 'bg-orange-500 text-white' : 'bg-[var(--surface)]'}`} onClick={() => setEater(player.id)}>{player.name}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={`min-h-11 rounded-xl font-bold ${!doubled ? 'bg-mint-500 text-white' : 'bg-[var(--surface)]'}`} onClick={() => setDoubled(false)}>مو مدبل</button><button type="button" className={`min-h-11 rounded-xl font-bold ${doubled ? 'bg-orange-500 text-white' : 'bg-[var(--surface)]'}`} onClick={() => setDoubled(true)}>مدبل</button></div></section>
    <Button className="w-full" size="lg" disabled={!valid || saving} icon={<Check/>} onClick={async () => {
      setSaving(true);
      try {
        const oldMan = { eaterPlayerId: eater, doubled };
        const input = partnership ? createPartnershipLashInput(normalized, oldMan) : createSoloLashInput(normalized, oldMan);
        await onConfirm(input, normalized);
      } finally { setSaving(false); }
    }}>حفظ اللطش</Button>
  </div>;
}
