import { ArrowRight, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calculateTarneeb41Round, deriveTarneeb41Phase, tarneeb41MinimumBid, validateTarneeb41Bids } from '../../games/tarneeb/scoring';
import type { GamePlayer, GameTeam, Tarneeb41PlayerRoundInput, Tarneeb41RoundInput, Tarneeb41RulesV2 } from '../../types';
import { scoreText } from '../../utils';
import { Button } from '../common/Button';
import { Stepper } from '../common/Stepper';

type Props = {
  players: GamePlayer[]; teams: GameTeam[]; scores: Record<string, number>; rules: Tarneeb41RulesV2;
  initial?: Tarneeb41RoundInput; onConfirm: (input: Tarneeb41RoundInput, delta: Record<string, number>) => Promise<void>; submitLabel?: string;
};

export function Tarneeb41RoundEntry({ players, teams, scores, rules, initial, onConfirm, submitLabel = 'تأكيد الجولة' }: Props) {
  const phase = deriveTarneeb41Phase(scores, teams);
  const minimumBid = tarneeb41MinimumBid(phase);
  const initialEntries = players.map((player) => {
    const saved = initial?.entries.find((entry) => entry.playerId === player.id);
    return { playerId: player.id, bid: saved?.bid ?? minimumBid, actualTricks: saved?.actualTricks ?? 0 };
  });
  const [step, setStep] = useState(initial ? 3 : 1);
  const [entries, setEntries] = useState<Tarneeb41PlayerRoundInput[]>(initialEntries);
  const [saving, setSaving] = useState(false);
  const bidValidation = validateTarneeb41Bids(entries, phase, rules);
  const totalTricks = entries.reduce((sum, entry) => sum + entry.actualTricks, 0);
  const calculation = useMemo(() => {
    if (!bidValidation.valid || totalTricks !== 13) return undefined;
    return calculateTarneeb41Round(entries, phase, players, rules);
  }, [bidValidation.valid, entries, phase, players, rules, totalTricks]);
  const setEntry = (playerId: string, changes: Partial<Tarneeb41PlayerRoundInput>) => setEntries((current) => current.map((entry) => entry.playerId === playerId ? { ...entry, ...changes } : entry));
  const phaseInfo = phase === 'normal' ? ['الوضع العادي', 'المضاعفات فعّالة'] : phase === 'thirty' ? ['مرحلة 30', 'المضاعفات متوقفة'] : ['مرحلة 41', 'الفوز محجوب حتى يصبح الشريك موجبًا'];
  const submit = async () => { if (!calculation || saving) return; setSaving(true); try { await onConfirm(calculation.input, calculation.delta); } finally { setSaving(false); } };

  return <div className="flex flex-col"><header className="mb-2 flex items-center justify-between gap-3"><div><span className="eyebrow">{phaseInfo[0]}</span><p className="muted text-xs">أقل ضمان: {minimumBid} · {phaseInfo[1]}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black dark:bg-white/10">{step} / 3</span></header>
    {step === 1 && <section><h3 className="mb-2 font-black">ضمانات اللاعبين</h3><div className="space-y-1">{entries.map((entry) => { const player = players.find((item) => item.id === entry.playerId)!; return <div key={entry.playerId} className="flex min-h-12 items-center gap-1 rounded-2xl border border-slate-200 bg-[var(--surface)] p-1 dark:border-white/10"><strong className="min-w-0 flex-1 truncate px-2 text-sm">{player.name}</strong><button className="grid size-9 place-items-center rounded-xl bg-slate-100 text-lg font-black disabled:opacity-30 dark:bg-white/10" disabled={entry.bid <= minimumBid} onClick={() => setEntry(entry.playerId, { bid: entry.bid - 1 })} aria-label={`إنقاص ضمان ${player.name}`}>−</button><b className="w-7 text-center text-lg">{entry.bid}</b><button className="grid size-9 place-items-center rounded-xl bg-mint-500/10 text-lg font-black text-mint-600 disabled:opacity-30" disabled={entry.bid >= rules.maximumBid} onClick={() => setEntry(entry.playerId, { bid: entry.bid + 1 })} aria-label={`زيادة ضمان ${player.name}`}>+</button></div>; })}</div><div className={`mt-2 rounded-2xl p-2 text-center font-black ${bidValidation.valid ? 'bg-mint-500/10 text-mint-700 dark:text-mint-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>{bidValidation.valid ? `مجموع الضمانات: ${bidValidation.totalBid} ✓` : <><span className="block">مجموع الضمانات: {bidValidation.totalBid} / {rules.minimumTotalBids}</span><small>المتبقي: {bidValidation.remaining}</small></>}</div></section>}
    {step === 2 && <section><h3 className="mb-1 font-black">لطوش اللاعبين</h3><p className="muted mb-2 text-xs">يجب أن يكون مجموع اللطوش 13.</p><div className="space-y-1">{entries.map((entry) => { const player = players.find((item) => item.id === entry.playerId)!; return <Stepper compact key={entry.playerId} label={`${player.name} · ضمن ${entry.bid}`} value={entry.actualTricks} max={entry.actualTricks + (13 - totalTricks)} onChange={(actualTricks) => setEntry(entry.playerId, { actualTricks })}/>; })}</div><div className={`mt-2 rounded-2xl p-2 text-center font-bold ${totalTricks === 13 ? 'bg-mint-500/10 text-mint-600' : 'bg-amber-500/10 text-amber-600'}`}>{totalTricks === 13 ? 'تم توزيع 13 لطش ✓' : `المتبقي من اللطوش: ${13 - totalTricks}`}</div></section>}
    {step === 3 && calculation && <section className="flex-1"><h3 className="mb-3 text-lg font-black">معاينة الجولة</h3><div className="grid grid-cols-2 gap-2">{calculation.input.entries.map((entry) => { const player = players.find((item) => item.id === entry.playerId)!; return <div key={entry.playerId} className={`rounded-2xl p-3 ${entry.success ? 'bg-mint-500/10' : 'bg-red-500/10'}`}><strong className="block">{player.name}</strong><span className="muted block text-xs">ضمن {entry.bid} · جاب {entry.actualTricks}</span><span className={`text-xs font-bold ${entry.success ? 'text-mint-600' : 'text-red-500'}`}>{entry.success ? 'وفّى' : 'انكسر'}</span><b className="mt-1 block text-2xl">{scoreText(entry.scoreDelta)}</b></div>; })}</div></section>}
    <div className="mt-3 grid grid-cols-2 gap-2">{step > 1 && <Button variant="secondary" icon={<ArrowRight size={17}/>} onClick={() => setStep(step - 1)}>السابق</Button>}{step < 3 ? <Button className={step === 1 ? 'col-span-2' : ''} disabled={step === 1 ? !bidValidation.valid : totalTricks !== 13} onClick={() => setStep(step + 1)}>التالي</Button> : <Button disabled={!calculation || saving} icon={<Check size={18}/>} onClick={submit}>{saving ? 'جارٍ الحفظ…' : submitLabel}</Button>}</div>
  </div>;
}
