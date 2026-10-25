import { Check, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { aggregateLikhaTeamScores, calculateLikhaRound, previewLikhaRound, validateLikhaRound } from '../../games/likha/engine';
import type { GamePlayer, GameTeam, LikhaMode, LikhaRoundInput, LikhaSpecialCard } from '../../types';
import { scoreText } from '../../utils';
import { Button } from '../common/Button';

const cards: Array<{ id: LikhaSpecialCard; symbol: string; label: string; value: string }> = [
  { id: 'queenSpades', symbol: '♠', label: 'بنت البستوني', value: '−13' },
  { id: 'tenDiamonds', symbol: '♦', label: '10 الديناري', value: '+10' },
  { id: 'kingClubs', symbol: '♣', label: 'ختيار الزهر', value: '−14' },
  { id: 'jackDiamonds', symbol: '♦', label: 'شب الديناري', value: '−11' }
];

export function LikhaRoundEntry({ players, scores, teams, mode = 'individual', initial, onConfirm, submitLabel = 'سجّل الجولة' }: { players: GamePlayer[]; scores: Record<string, number>; teams?: GameTeam[]; mode?: LikhaMode; initial?: LikhaRoundInput; onConfirm: (input: LikhaRoundInput, delta: Record<string, number>) => Promise<void>; submitLabel?: string }) {
  const [input, setInput] = useState<LikhaRoundInput>(() => structuredClone(initial ?? {
    players: players.map((player) => ({ playerId: player.id, heartsCount: 0 })),
    specialCards: { jackDiamonds: { capturedBy: '', doubled: false }, queenSpades: { capturedBy: '', doubled: false }, kingClubs: { capturedBy: '', doubled: false }, tenDiamonds: { capturedBy: '', doubled: false } }
  }));
  const [saving, setSaving] = useState(false);
  const ids = useMemo(() => players.map((player) => player.id), [players]);
  const heartsTotal = input.players.reduce((sum, entry) => sum + entry.heartsCount, 0);
  const validation = validateLikhaRound(input, ids);
  const preview = previewLikhaRound(input, ids);
  const partnership = mode === 'partnership' && teams?.length === 2;
  const teamRound = partnership ? aggregateLikhaTeamScores(preview, teams) : undefined;
  const teamTotals = partnership ? aggregateLikhaTeamScores(Object.fromEntries(ids.map((id) => [id, (scores[id] ?? 0) + preview[id]])), teams) : undefined;
  const setHearts = (playerId: string, value: number) => setInput((current) => ({ ...current, players: current.players.map((entry) => entry.playerId === playerId ? { ...entry, heartsCount: Math.max(0, Math.min(13, value)) } : entry) }));
  const setCard = (card: LikhaSpecialCard, changes: Partial<LikhaRoundInput['specialCards'][LikhaSpecialCard]>) => setInput((current) => ({ ...current, specialCards: { ...current.specialCards, [card]: { ...current.specialCards[card], ...changes } } }));
  const submit = async () => { if (!validation.valid || saving) return; setSaving(true); try { await onConfirm(input, calculateLikhaRound(input, ids)); } finally { setSaving(false); } };

  return <div className="space-y-4">
    {partnership && <section><div className="mb-2"><span className="eyebrow">النتيجة الرسمية المباشرة</span><h3 className="font-black">مجموع الشريكين</h3></div><div className="grid grid-cols-2 gap-2">{teams.map((team) => <article key={team.id} className="rounded-2xl bg-slate-900 p-3 text-center text-white dark:bg-white dark:text-slate-950"><strong className="block truncate text-sm">{team.name}</strong><span className="mt-1 block text-xl font-black tabular-nums">{scoreText(teamRound?.[team.id] ?? 0)}</span><small className="opacity-70">بعد الجولة {scoreText(teamTotals?.[team.id] ?? 0)}</small></article>)}</div></section>}
    <section><div className="mb-2 flex items-end justify-between"><div><span className="eyebrow">الكوبا</span><h3 className="font-black">وزّع 13 كوباية</h3></div><strong className={heartsTotal === 13 ? 'text-mint-600' : heartsTotal > 13 ? 'text-red-500' : 'text-amber-600'}>{heartsTotal} / 13</strong></div>
      <div className="grid grid-cols-2 gap-2">{input.players.map((entry) => { const player = players.find((item) => item.id === entry.playerId)!; return <article key={entry.playerId} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-start justify-between gap-2"><strong className="min-w-0 truncate text-sm">{player.name}</strong><span className={`shrink-0 text-lg font-black ${preview[player.id] < 0 ? 'text-red-500' : 'text-mint-600'}`}>{scoreText(preview[player.id])}</span></div><small className="muted block">المجموع بعد الجولة: {scoreText((scores[player.id] ?? 0) + preview[player.id])}</small><div className="mt-2 grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-1"><button className="grid size-10 place-items-center rounded-xl bg-red-500/10 text-red-600 disabled:opacity-30" disabled={entry.heartsCount === 0} onClick={() => setHearts(player.id, entry.heartsCount - 1)} aria-label={`إنقاص كوبا ${player.name}`}><Minus size={17}/></button><b className="text-center text-2xl tabular-nums">{entry.heartsCount}</b><button className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600 disabled:opacity-30" disabled={heartsTotal >= 13} onClick={() => setHearts(player.id, entry.heartsCount + 1)} aria-label={`زيادة كوبا ${player.name}`}><Plus size={17}/></button></div></article>; })}</div>
    </section>

    <section><span className="eyebrow">الورق الخاص</span><h3 className="mb-2 font-black">حدد مين أكل كل ورقة</h3><div className="space-y-2">{cards.map((card) => { const capture = input.specialCards[card.id]; return <article key={card.id} className={`rounded-2xl border p-3 transition ${capture.doubled ? 'border-rose-400 bg-rose-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`}><div className="flex items-center gap-2"><span className={`text-2xl ${card.id === 'queenSpades' ? 'text-slate-900 dark:text-white' : card.id.includes('Diamonds') ? 'text-red-500' : ''}`}>{card.symbol}</span><div className="min-w-0 flex-1"><strong className="block">{card.label}</strong><small className="muted">{card.value}{capture.doubled ? ' ×2' : ''}</small></div><button type="button" aria-pressed={capture.doubled} className={`min-h-10 rounded-xl px-3 text-xs font-black transition ${capture.doubled ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-white/10'}`} onClick={() => setCard(card.id, { doubled: !capture.doubled })}>×2 مدبل</button></div><div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">{players.map((player) => <button key={player.id} type="button" aria-pressed={capture.capturedBy === player.id} className={`min-h-10 min-w-0 truncate rounded-xl px-2 text-xs font-black ${capture.capturedBy === player.id ? card.id === 'tenDiamonds' ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-100 dark:bg-white/5'}`} onClick={() => setCard(card.id, { capturedBy: player.id })}>{player.name}</button>)}</div></article>; })}</div></section>

    {!validation.valid && <div className="rounded-2xl bg-amber-500/10 p-3 text-center text-xs font-bold text-amber-700 dark:text-amber-300">{validation.errors[0]}</div>}
    <Button className="w-full" size="lg" disabled={!validation.valid || saving} icon={<Check size={18}/>} onClick={submit}>{saving ? 'جارٍ الحفظ…' : submitLabel}</Button>
  </div>;
}
