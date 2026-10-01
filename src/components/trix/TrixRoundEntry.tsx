import { Check, ChevronsUp, Medal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { aggregatePartnershipScores, calculateTrixRound, validateTrixInput } from '../../games/trix/scoring';
import { CONTRACT_LABELS, TRIX_QUEENS } from '../../games/trix/rules';
import type { DoubledQueenResult, GamePlayer, GameTeam, TrixContract, TrixMode, TrixRoundInput, TrixRules } from '../../types';
import { scoreText } from '../../utils';
import { Button } from '../common/Button';
import { Stepper } from '../common/Stepper';

type Props = { contract: TrixContract; players: GamePlayer[]; teams?: GameTeam[]; mode?: TrixMode; rules: TrixRules; initial?: TrixRoundInput; onConfirm: (input: TrixRoundInput, delta: Record<string, number>) => Promise<void>; submitLabel?: string };
type ScoreTarget = { id: string; name: string };
const zeroCounts = (targets: ScoreTarget[]) => Object.fromEntries(targets.map((target) => [target.id, 0]));
const blankQueens = (count: number): DoubledQueenResult[] => TRIX_QUEENS.slice(0, count).map(({ id }) => ({ id, suit: id, doubled: false }));

function queensFromInput(input: TrixRoundInput | undefined, count: number, partnership: boolean, teams?: GameTeam[]): DoubledQueenResult[] {
  if (!input || !('queens' in input) || !input.queens) return blankQueens(count);
  const savedQueens = input.queens;
  if (Array.isArray(savedQueens)) return blankQueens(count).map((blank, index) => {
    const saved = savedQueens[index];
    if (!saved) return blank;
    const takenByTeamId = saved.takenByTeamId ?? (partnership ? teams?.find((team) => team.playerIds.includes(saved.takenByPlayerId ?? ''))?.id : undefined);
    return { ...saved, id: blank.id, suit: blank.suit, takenByPlayerId: partnership ? undefined : saved.takenByPlayerId, takenByTeamId };
  });
  const expanded = Object.entries(savedQueens).flatMap(([playerId, amount]) => Array.from({ length: amount }, () => playerId));
  return blankQueens(count).map((queen, index) => partnership ? { ...queen, takenByTeamId: teams?.find((team) => team.playerIds.includes(expanded[index] ?? ''))?.id } : { ...queen, takenByPlayerId: expanded[index] });
}

function countsForTargets(record: Record<string, number> | undefined, targets: ScoreTarget[], partnership: boolean, teams?: GameTeam[], total = 0) {
  if (!record) return partnership && targets.length === 2 ? { [targets[0].id]: 0, [targets[1].id]: total } : zeroCounts(targets);
  if (!partnership) return Object.fromEntries(targets.map((target) => [target.id, record[target.id] ?? 0]));
  return Object.fromEntries((teams ?? []).map((team) => [team.id, record[team.id] ?? team.playerIds.reduce((sum, id) => sum + (record[id] ?? 0), 0)]));
}

export function TrixRoundEntry({ contract, players, teams, mode, rules, initial, onConfirm, submitLabel = 'تأكيد النتيجة' }: Props) {
  const partnership = mode === 'partnership' && Boolean(teams?.length === 2);
  const targets: ScoreTarget[] = useMemo(() => partnership ? teams! : players, [partnership, teams, players]);
  const [selected, setSelected] = useState('');
  const [kingDoubled, setKingDoubled] = useState(false);
  const [kingDoubler, setKingDoubler] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>(countsForTargets(undefined, targets, partnership, teams, contract === 'diamonds' ? rules.diamondCount : rules.trickCount));
  const [queens, setQueens] = useState<DoubledQueenResult[]>(blankQueens(rules.queenCount));
  const [diamonds, setDiamonds] = useState<Record<string, number>>(countsForTargets(undefined, targets, partnership, teams, rules.diamondCount));
  const [tricks, setTricks] = useState<Record<string, number>>(countsForTargets(undefined, targets, partnership, teams, rules.trickCount));
  const [order, setOrder] = useState<string[]>([]);
  const [complexStep, setComplexStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const kingDoubledBy = initial?.contract === 'king' ? initial.doubledByPlayerId : initial?.contract === 'complex' ? initial.kingDoubledByPlayerId : undefined;
    setSelected(initial?.contract === 'king' ? initial.selectedTeamId ?? initial.selectedPlayerId ?? '' : initial?.contract === 'complex' ? initial.kingTeamId ?? initial.kingPlayerId ?? '' : '');
    setKingDoubled(Boolean(kingDoubledBy)); setKingDoubler(kingDoubledBy ?? '');
    setCounts(countsForTargets(initial && ['diamonds', 'tricks'].includes(initial.contract) && 'counts' in initial ? initial.counts : undefined, targets, partnership, teams, contract === 'diamonds' ? rules.diamondCount : rules.trickCount));
    setOrder(initial?.contract === 'trix' ? initial.order : []);
    setQueens(queensFromInput(initial, rules.queenCount, partnership, teams));
    setDiamonds(countsForTargets(initial?.contract === 'complex' ? initial.diamonds : undefined, targets, partnership, teams, rules.diamondCount));
    setTricks(countsForTargets(initial?.contract === 'complex' ? initial.tricks : undefined, targets, partnership, teams, rules.trickCount));
    setComplexStep(1);
  }, [contract, initial, players, rules.queenCount, rules.diamondCount, rules.trickCount, partnership, teams, targets]);

  const input = useMemo<TrixRoundInput>(() => {
    if (contract === 'king') return { contract, ...(partnership ? { selectedTeamId: selected } : { selectedPlayerId: selected }), doubled: kingDoubled, doubledByPlayerId: kingDoubled ? kingDoubler : undefined };
    if (contract === 'trix') return { contract, order };
    if (contract === 'complex') return { contract, ...(partnership ? { kingTeamId: selected } : { kingPlayerId: selected }), kingDoubled: kingDoubled, kingDoubledByPlayerId: kingDoubled ? kingDoubler : undefined, queens, diamonds, tricks };
    if (contract === 'queens') return { contract, queens };
    return { contract, counts };
  }, [contract, selected, kingDoubled, kingDoubler, order, queens, diamonds, tricks, counts, partnership]);
  const delta = useMemo(() => calculateTrixRound(input, players, rules, teams), [input, players, rules, teams]);
  const previewDelta = partnership ? aggregatePartnershipScores(delta, teams!) : delta;
  const valid = validateTrixInput(input, rules);
  const complexStepValid = complexStep === 1 ? Boolean(selected && (!kingDoubled || kingDoubler))
    : complexStep === 2 ? queens.every((queen) => (queen.takenByTeamId ?? queen.takenByPlayerId) && (!queen.doubled || queen.doubledByPlayerId))
      : complexStep === 3 ? Object.values(diamonds).reduce((sum, value) => sum + value, 0) === rules.diamondCount
        : Object.values(tricks).reduce((sum, value) => sum + value, 0) === rules.trickCount;
  const submit = async () => { if (!valid || saving) return; setSaving(true); try { await onConfirm(input, delta); } finally { setSaving(false); } };

  return <div className="space-y-4"><header className="flex items-end justify-between"><div><span className="eyebrow">تسجيل الجولة</span><h2 className="text-2xl font-black">{CONTRACT_LABELS[contract]}</h2></div>{contract === 'complex' && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black dark:bg-white/10">{complexStep} / 4</span>}</header>
    {contract === 'king' && <><TargetChoice question={partnership ? 'أي فريق أكل شيخ الكبة؟' : 'مين أكل شيخ الكبة؟'} targets={targets} selected={selected} onSelect={setSelected}/>{rules.doublingEnabled && <DoublingChoice players={players} doubled={kingDoubled} doubler={kingDoubler} onDoubled={setKingDoubled} onDoubler={setKingDoubler}/>}</>}
    {contract === 'queens' && <QueensEntry players={players} targets={targets} partnership={partnership} queens={queens} onChange={setQueens}/>} 
    {['diamonds', 'tricks'].includes(contract) && (partnership ? <TeamCountSection teams={teams!} counts={counts} setCounts={setCounts} total={contract === 'diamonds' ? rules.diamondCount : rules.trickCount} label={contract === 'diamonds' ? 'الديناري' : 'اللطوش'}/> : <CountSection targets={targets} counts={counts} setCounts={setCounts} total={contract === 'diamonds' ? rules.diamondCount : rules.trickCount} label={contract === 'diamonds' ? 'الديناري' : 'اللطوش'}/>)} 
    {contract === 'trix' && <div><p className="mb-3 font-bold">{order.length < 4 ? `مين خلص ${['أول', 'ثاني', 'ثالث', 'رابع'][order.length]}؟` : 'اكتمل ترتيب النهاية'}</p><div className="grid grid-cols-2 gap-2">{players.map((player) => { const rank = order.indexOf(player.id); return <button key={player.id} disabled={rank >= 0} onClick={() => setOrder([...order, player.id])} className={`min-h-14 rounded-2xl border font-bold ${rank >= 0 ? 'border-mint-500 bg-mint-500/10 text-mint-600' : 'border-slate-200 dark:border-white/10'}`}>{rank >= 0 && <Medal className="ms-1 inline" size={17}/>} {rank >= 0 ? `${rank + 1}. ` : ''}{player.name}</button>; })}</div>{order.length > 0 && <button className="mt-2 min-h-11 text-sm font-bold text-slate-500" onClick={() => setOrder(order.slice(0, -1))}>إلغاء آخر اختيار</button>}</div>}
    {contract === 'complex' && <div className="space-y-4">{complexStep === 1 && <><TargetChoice question={partnership ? 'أي فريق أكل شيخ الكبة؟' : 'مين أكل شيخ الكبة؟'} targets={targets} selected={selected} onSelect={setSelected}/>{rules.doublingEnabled && <DoublingChoice players={players} doubled={kingDoubled} doubler={kingDoubler} onDoubled={setKingDoubled} onDoubler={setKingDoubler}/>}</>}{complexStep === 2 && <QueensEntry players={players} targets={targets} partnership={partnership} queens={queens} onChange={setQueens}/>} {complexStep === 3 && (partnership ? <TeamCountSection teams={teams!} counts={diamonds} setCounts={setDiamonds} total={rules.diamondCount} label="الديناري"/> : <CountSection targets={targets} counts={diamonds} setCounts={setDiamonds} total={rules.diamondCount} label="الديناري"/>)}{complexStep === 4 && (partnership ? <TeamCountSection teams={teams!} counts={tricks} setCounts={setTricks} total={rules.trickCount} label="اللطوش"/> : <CountSection targets={targets} counts={tricks} setCounts={setTricks} total={rules.trickCount} label="اللطوش"/>)}</div>}
    {(contract !== 'complex' || complexStep === 4) && <div className="rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><span className="mb-2 block text-xs font-bold text-slate-500">معاينة النقاط</span><div className="grid grid-cols-2 gap-2">{targets.map((target) => <div key={target.id} className="flex justify-between rounded-xl bg-[var(--surface)] px-3 py-2 text-sm"><span>{target.name}</span><strong className={previewDelta[target.id] < 0 ? 'text-red-500' : 'text-mint-600'}>{scoreText(previewDelta[target.id])}</strong></div>)}</div></div>}
    {contract === 'complex' && complexStep < 4 ? <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-[var(--surface)] pt-2"><Button variant="secondary" disabled={complexStep === 1} onClick={() => setComplexStep((step) => step - 1)}>السابق</Button><Button disabled={!complexStepValid} onClick={() => setComplexStep((step) => step + 1)}>التالي</Button></div> : <div className="sticky bottom-0 grid gap-2 bg-[var(--surface)] pt-2">{contract === 'complex' && <Button variant="secondary" onClick={() => setComplexStep(3)}>السابق</Button>}<Button className="w-full" size="lg" disabled={!valid || saving} icon={<Check size={20}/>} onClick={submit}>{saving ? 'جارٍ الحفظ…' : submitLabel}</Button></div>}
  </div>;
}

function TargetChoice({ question, targets, selected, onSelect }: { question: string; targets: ScoreTarget[]; selected: string; onSelect: (id: string) => void }) {
  return <div><p className="mb-2 font-bold">{question}</p><div className="grid grid-cols-2 gap-2">{targets.map((target) => <button key={target.id} onClick={() => onSelect(target.id)} aria-pressed={selected === target.id} className={`min-h-12 rounded-2xl border font-bold ${selected === target.id ? 'border-mint-500 bg-mint-500/10 text-mint-600' : 'border-slate-200 dark:border-white/10'}`}>{target.name}</button>)}</div></div>;
}

function DoublingChoice({ players, doubled, doubler, onDoubled, onDoubler }: { players: GamePlayer[]; doubled: boolean; doubler: string; onDoubled: (value: boolean) => void; onDoubler: (id: string) => void }) {
  return <section className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><div className="flex items-center justify-between gap-3"><span className="font-bold">هل الورقة مدبلة؟</span><button aria-pressed={doubled} onClick={() => { onDoubled(!doubled); if (doubled) onDoubler(''); }} className={`min-h-11 rounded-xl px-4 font-bold ${doubled ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>{doubled ? 'مدبلة' : 'عادية'}</button></div>{doubled && <div className="mt-3"><p className="mb-2 text-sm font-bold">مين دبّلها؟</p><div className="grid grid-cols-4 gap-1">{players.map((player) => <button key={player.id} onClick={() => onDoubler(player.id)} aria-pressed={doubler === player.id} className={`min-h-11 truncate rounded-xl px-1 text-xs font-bold ${doubler === player.id ? 'bg-orange-500/15 text-orange-600 ring-1 ring-orange-500' : 'bg-slate-100 dark:bg-white/10'}`}>{player.name}</button>)}</div></div>}</section>;
}

function QueensEntry({ players, targets, partnership, queens, onChange }: { players: GamePlayer[]; targets: ScoreTarget[]; partnership: boolean; queens: DoubledQueenResult[]; onChange: (queens: DoubledQueenResult[]) => void }) {
  const [active, setActive] = useState(0); const queen = queens[active];
  const update = (changes: Partial<DoubledQueenResult>) => onChange(queens.map((item, index) => index === active ? { ...item, ...changes } : item));
  const targetId = queen.takenByTeamId ?? queen.takenByPlayerId ?? '';
  const complete = queens.filter((item) => (item.takenByTeamId ?? item.takenByPlayerId) && (!item.doubled || item.doubledByPlayerId)).length;
  const label = TRIX_QUEENS.find((item) => item.id === (queen.suit ?? queen.id))?.label ?? 'بنت';
  return <section><div className="mb-2 flex items-center justify-between"><h3 className="font-black">البنات</h3><span className="text-xs font-bold text-mint-600">{complete} / {queens.length}</span></div><div className="mb-3 grid grid-cols-2 gap-2">{queens.map((item, index) => { const itemLabel = TRIX_QUEENS.find((named) => named.id === (item.suit ?? item.id))?.label ?? 'بنت'; const done = item.takenByTeamId ?? item.takenByPlayerId; return <button key={item.id} onClick={() => setActive(index)} className={`min-h-11 rounded-xl px-2 text-xs font-black ${active === index ? 'bg-mint-500 text-white' : done ? 'bg-mint-500/10 text-mint-600' : 'bg-slate-100 dark:bg-white/10'}`}>{itemLabel}{item.doubled ? ' ↑' : ''}</button>; })}</div><div className="rounded-2xl border border-slate-200 p-3 dark:border-white/10"><h4 className="mb-3 text-center font-black">{label}</h4><TargetChoice question={partnership ? 'أي فريق أكلها؟' : 'مين أكلها؟'} targets={targets} selected={targetId} onSelect={(id) => update(partnership ? { takenByTeamId: id, takenByPlayerId: undefined } : { takenByPlayerId: id, takenByTeamId: undefined })}/><div className="mt-3"><DoublingChoice players={players} doubled={queen.doubled} doubler={queen.doubledByPlayerId ?? ''} onDoubled={(doubled) => update({ doubled, doubledByPlayerId: doubled ? queen.doubledByPlayerId : undefined })} onDoubler={(id) => update({ doubledByPlayerId: id })}/></div>{active < queens.length - 1 && targetId && (!queen.doubled || queen.doubledByPlayerId) && <button className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold dark:bg-white/10" onClick={() => setActive(active + 1)}>البنت التالية <ChevronsUp className="rotate-90" size={16}/></button>}</div><div className="mt-3 space-y-1">{queens.filter((item) => item.takenByTeamId ?? item.takenByPlayerId).map((item, index) => { const itemLabel = TRIX_QUEENS.find((named) => named.id === (item.suit ?? item.id))?.label ?? TRIX_QUEENS[index]?.label; const eater = targets.find((target) => target.id === (item.takenByTeamId ?? item.takenByPlayerId))?.name; const doubler = players.find((player) => player.id === item.doubledByPlayerId)?.name; return <p key={item.id} className="rounded-xl bg-slate-100 px-3 py-2 text-xs dark:bg-white/5"><strong>{itemLabel}</strong> · أكلها: {eater} · {item.doubled ? `مدبلة، دبّلها: ${doubler}` : 'غير مدبلة'}</p>; })}</div></section>;
}

function CountSection({ targets, counts, setCounts, total, label }: { targets: ScoreTarget[]; counts: Record<string, number>; setCounts: (value: Record<string, number>) => void; total: number; label: string }) {
  const used = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return <section><div className="mb-2 flex items-center justify-between"><h3 className="font-black">{label}</h3><span className={`text-xs font-bold ${used === total ? 'text-mint-600' : 'text-amber-500'}`}>{used === total ? `تم توزيع جميع ${label}` : `المتبقي: ${total - used}`}</span></div><div className="space-y-2">{targets.map((target) => <Stepper key={target.id} label={target.name} value={counts[target.id] ?? 0} max={(counts[target.id] ?? 0) + (total - used)} onChange={(value) => setCounts({ ...counts, [target.id]: value })}/>)}</div></section>;
}

function TeamCountSection({ teams, counts, setCounts, total, label }: { teams: GameTeam[]; counts: Record<string, number>; setCounts: (value: Record<string, number>) => void; total: number; label: string }) {
  const first = counts[teams[0].id] ?? 0; const second = total - first;
  return <section><div className="mb-3 flex items-center justify-between"><h3 className="font-black">{label} حسب الفريق</h3><span className="text-xs font-bold text-mint-600">المجموع {total} ✓</span></div><Stepper label={teams[0].name} value={first} max={total} onChange={(value) => setCounts({ [teams[0].id]: value, [teams[1].id]: total - value })}/><div className="mt-2 flex min-h-12 items-center justify-between rounded-2xl bg-slate-100 px-4 dark:bg-white/5"><strong>{teams[1].name}</strong><b className="text-xl tabular-nums">{second}</b></div></section>;
}
