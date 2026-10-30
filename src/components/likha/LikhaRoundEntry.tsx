import { Check, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { aggregateLikhaTeamScores, calculateLikhaRound, complementaryLikhaHearts, previewLikhaRound, validateLikhaRound } from '../../games/likha/engine';
import type { GamePlayer, GameTeam, LikhaMode, LikhaRoundInput, LikhaSpecialCard } from '../../types';
import { scoreText } from '../../utils';
import { Button } from '../common/Button';

const cards: Array<{ id: LikhaSpecialCard; symbol: string; short: string; label: string; value: string }> = [
  { id: 'queenSpades', symbol: '♠', short: 'Q♠', label: 'بنت البستوني', value: '−13' },
  { id: 'tenDiamonds', symbol: '♦', short: '10♦', label: '10 الديناري', value: '+10' },
  { id: 'kingClubs', symbol: '♣', short: 'K♣', label: 'ختيار الزهر', value: '−14' },
  { id: 'jackDiamonds', symbol: '♦', short: 'J♦', label: 'شب الديناري', value: '−11' }
];

type Props = { players: GamePlayer[]; scores: Record<string, number>; teams?: GameTeam[]; mode?: LikhaMode; initial?: LikhaRoundInput; onConfirm: (input: LikhaRoundInput, delta: Record<string, number>) => Promise<void>; submitLabel?: string };

function blankInput(players: GamePlayer[]): LikhaRoundInput {
  return { players: players.map((player) => ({ playerId: player.id, heartsCount: 0 })), specialCards: { jackDiamonds: { capturedBy: '', doubled: false }, queenSpades: { capturedBy: '', doubled: false }, kingClubs: { capturedBy: '', doubled: false }, tenDiamonds: { capturedBy: '', doubled: false } } };
}

function partnershipInput(players: GamePlayer[], teams: GameTeam[], initial?: LikhaRoundInput): LikhaRoundInput {
  const source = structuredClone(initial ?? blankInput(players));
  if (source.partnership) return source;
  const firstTeam = teams[0];
  const enteredTeamHearts = source.players.filter((entry) => firstTeam.playerIds.includes(entry.playerId)).reduce((sum, entry) => sum + entry.heartsCount, 0);
  return { ...source, partnership: { enteredTeamId: firstTeam.id, enteredTeamHearts, cardTeams: Object.fromEntries(cards.map((card) => [card.id, teams.find((team) => team.playerIds.includes(source.specialCards[card.id].capturedBy))?.id ?? ''])) as Record<LikhaSpecialCard, string> } };
}

export function LikhaRoundEntry({ players, scores, teams, mode = 'individual', initial, onConfirm, submitLabel = 'سجّل الجولة' }: Props) {
  const partnership = mode === 'partnership' && teams?.length === 2;
  const activeTeams = partnership ? teams! : [];
  const [input, setInput] = useState<LikhaRoundInput>(() => partnership ? partnershipInput(players, activeTeams, initial) : structuredClone(initial ?? blankInput(players)));
  const [saving, setSaving] = useState(false);
  const ids = useMemo(() => players.map((player) => player.id), [players]);
  const validation = validateLikhaRound(input, ids, activeTeams);
  const preview = previewLikhaRound(input, ids, activeTeams);
  const teamRound = partnership ? preview : undefined;
  const currentTeamTotals = partnership ? aggregateLikhaTeamScores(scores, activeTeams) : undefined;
  const teamTotals = partnership ? Object.fromEntries(activeTeams.map((team) => [team.id, (currentTeamTotals?.[team.id] ?? 0) + (teamRound?.[team.id] ?? 0)])) : undefined;
  const heartsTotal = input.players.reduce((sum, entry) => sum + entry.heartsCount, 0);
  const playerName = (id: string) => players.find((player) => player.id === id)?.name ?? '';
  const setHearts = (playerId: string, value: number) => setInput((current) => ({ ...current, players: current.players.map((entry) => entry.playerId === playerId ? { ...entry, heartsCount: Math.max(0, Math.min(13, value)) } : entry) }));
  const setCard = (card: LikhaSpecialCard, changes: Partial<LikhaRoundInput['specialCards'][LikhaSpecialCard]>) => setInput((current) => ({ ...current, specialCards: { ...current.specialCards, [card]: { ...current.specialCards[card], ...changes } } }));
  const setEnteredTeam = (teamId: string) => setInput((current) => ({ ...current, partnership: { ...current.partnership!, enteredTeamId: teamId, enteredTeamHearts: teamId === current.partnership!.enteredTeamId ? current.partnership!.enteredTeamHearts : complementaryLikhaHearts(current.partnership!.enteredTeamHearts) } }));
  const setTeamHearts = (value: number) => setInput((current) => ({ ...current, partnership: { ...current.partnership!, enteredTeamHearts: Math.max(0, Math.min(13, value)) } }));
  const setCardTeam = (card: LikhaSpecialCard, teamId: string) => setInput((current) => {
    const selectedTeam = activeTeams.find((team) => team.id === teamId)!;
    const owner = current.specialCards[card].capturedBy;
    return { ...current, partnership: { ...current.partnership!, cardTeams: { ...current.partnership!.cardTeams, [card]: teamId } }, specialCards: { ...current.specialCards, [card]: { ...current.specialCards[card], capturedBy: selectedTeam.playerIds.includes(owner) ? owner : '' } } };
  });
  const submit = async () => { if (!validation.valid || saving) return; setSaving(true); try { await onConfirm(input, calculateLikhaRound(input, ids, activeTeams)); } finally { setSaving(false); } };

  if (partnership) return <div className="space-y-3">
    <section data-testid="likha-official-team-score" className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
      <div className="mb-2 flex items-center justify-between"><div><span className="eyebrow">النتيجة الرسمية</span><h3 className="font-black">فريق ضد فريق</h3></div><span className="muted text-xs">الجولة الحالية</span></div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">{activeTeams.flatMap((team, index) => [index === 1 && <b key="vs" className="text-xs text-[var(--text-muted)]">ضد</b>, <TeamScoreCard key={team.id} team={team} names={team.playerIds.map(playerName)} total={teamTotals?.[team.id] ?? 0} delta={teamRound?.[team.id] ?? 0} leader={(teamTotals?.[team.id] ?? 0) === Math.max(...Object.values(teamTotals ?? {}))}/>])}</div>
    </section>

    <section data-testid="likha-partnership-hearts" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-3"><span className="eyebrow">♥ الكوبا</span><h3 className="font-black">أدخل كوبا فريق واحد فقط</h3></div>
      <div className="mb-3 grid grid-cols-2 gap-2">{activeTeams.map((team) => <button key={team.id} type="button" aria-pressed={input.partnership!.enteredTeamId === team.id} className={`min-h-12 rounded-2xl border px-2 text-sm font-black ${input.partnership!.enteredTeamId === team.id ? 'border-rose-500 bg-rose-500/10 text-rose-600' : 'border-[var(--border)] bg-[var(--surface-elevated)]'}`} onClick={() => setEnteredTeam(team.id)}>{team.name}</button>)}</div>
      <div className="grid grid-cols-2 gap-2">{activeTeams.map((team) => {
        const entered = input.partnership!.enteredTeamId === team.id;
        const value = entered ? input.partnership!.enteredTeamHearts : complementaryLikhaHearts(input.partnership!.enteredTeamHearts);
        return <div key={team.id} className={`rounded-2xl border p-3 ${entered ? 'border-rose-500/40 bg-rose-500/5' : 'border-[var(--border)] bg-[var(--surface-elevated)]'}`}><strong className="block truncate text-sm">{team.name}</strong>{entered ? <HeartCounter playerName={team.name} value={value} disabledPlus={value >= 13} onChange={setTeamHearts}/> : <><b data-testid="likha-derived-hearts" className="mt-2 block text-center text-3xl tabular-nums">{value}</b><small className="muted block text-center text-[10px]">محسوبة تلقائياً · 13 − {input.partnership!.enteredTeamHearts}</small></>}</div>;
      })}</div>
    </section>

    <section data-testid="likha-special-cards"><span className="eyebrow">الورق الخاص</span><h3 className="mb-2 font-black">أي فريق أخذ الورقة؟</h3><div className="space-y-2">{cards.map((card) => {
      const capture = input.specialCards[card.id];
      const selectedTeamId = input.partnership!.cardTeams[card.id];
      const selectedTeam = activeTeams.find((team) => team.id === selectedTeamId);
      return <article key={card.id} className={`rounded-2xl border p-3 transition ${capture.doubled ? 'border-rose-400 bg-rose-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`}>
        <div className="flex items-center gap-2"><span className={`text-2xl ${card.id.includes('Diamonds') ? 'text-red-500' : ''}`}>{card.symbol}</span><div className="min-w-0 flex-1"><strong className="block">{card.label}</strong><small className="muted">{card.value}{capture.doubled ? ' ×2' : ''}</small></div><button type="button" aria-pressed={capture.doubled} className={`min-h-11 rounded-xl px-3 text-xs font-black ${capture.doubled ? 'bg-rose-500 text-white' : 'bg-[var(--surface-elevated)]'}`} onClick={() => setCard(card.id, { doubled: !capture.doubled })}>×2 مدبل</button></div>
        <div className="mt-2 grid grid-cols-2 gap-2">{activeTeams.map((team) => <button key={team.id} type="button" aria-pressed={selectedTeamId === team.id} className={`min-h-12 min-w-0 truncate rounded-xl border px-2 text-sm font-black ${selectedTeamId === team.id ? card.id === 'tenDiamonds' ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-mint-500 bg-mint-500 text-white' : 'border-[var(--border)] bg-[var(--surface-elevated)]'}`} onClick={() => setCardTeam(card.id, team.id)}>{team.name}</button>)}</div>
        {selectedTeam && <div className="mt-2 rounded-xl bg-[var(--surface-elevated)] p-2"><small className="muted block text-center text-[10px]">من أخذها؟ اختياري للإحصائيات</small><div className="mt-1 grid grid-cols-2 gap-1">{selectedTeam.playerIds.map((id) => <OwnerButton key={id} name={playerName(id)} active={capture.capturedBy === id} gold={card.id === 'tenDiamonds'} onClick={() => setCard(card.id, { capturedBy: capture.capturedBy === id ? '' : id })}/>)}</div></div>}
      </article>;
    })}</div></section>

    <section data-testid="likha-team-preview" className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3"><span className="eyebrow">معاينة الجولة</span><div className="mt-2 grid grid-cols-2 gap-2">{activeTeams.map((team) => { const hearts = input.partnership!.enteredTeamId === team.id ? input.partnership!.enteredTeamHearts : complementaryLikhaHearts(input.partnership!.enteredTeamHearts); const owned = cards.filter((card) => input.partnership!.cardTeams[card.id] === team.id); return <div key={team.id} className="rounded-2xl bg-[var(--surface)] p-3"><strong className="block truncate text-sm">{team.name}</strong><small className="muted block">♥ {hearts}{owned.length ? ` · ${owned.map((card) => `${card.short}${input.specialCards[card.id].doubled ? ' ×2' : ''}`).join(' · ')}` : ''}</small><b className={`mt-1 block text-xl ${(teamRound?.[team.id] ?? 0) < 0 ? 'text-red-500' : 'text-mint-600'}`}>المجموع: {scoreText(teamRound?.[team.id] ?? 0)}</b></div>; })}</div></section>
    {!validation.valid && <div className="rounded-2xl bg-amber-500/10 p-3 text-center text-xs font-bold text-amber-700 dark:text-amber-300">{validation.errors[0]}</div>}
    <Button className="w-full" size="lg" disabled={!validation.valid || saving} icon={<Check size={18}/>} onClick={submit}>{saving ? 'جاري الحفظ…' : submitLabel}</Button>
  </div>;

  return <div className="space-y-4">
    <section><div className="mb-2 flex items-end justify-between"><div><span className="eyebrow">الكوبا</span><h3 className="font-black">وزّع 13 كوباية</h3></div><strong className={heartsTotal === 13 ? 'text-mint-600' : 'text-amber-600'}>{heartsTotal} / 13</strong></div><div className="grid grid-cols-2 gap-2">{input.players.map((entry) => <article key={entry.playerId} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="flex items-start justify-between gap-2"><strong className="min-w-0 truncate text-sm">{playerName(entry.playerId)}</strong><span className={`shrink-0 text-lg font-black ${preview[entry.playerId] < 0 ? 'text-red-500' : 'text-mint-600'}`}>{scoreText(preview[entry.playerId])}</span></div><small className="muted block">بعد الجولة: {scoreText((scores[entry.playerId] ?? 0) + preview[entry.playerId])}</small><HeartCounter playerName={playerName(entry.playerId)} value={entry.heartsCount} disabledPlus={heartsTotal >= 13} onChange={(value) => setHearts(entry.playerId, value)}/></article>)}</div></section>
    <section data-testid="likha-special-cards"><span className="eyebrow">الورق الخاص</span><h3 className="mb-2 font-black">حدد صاحب كل ورقة</h3><div className="space-y-2">{cards.map((card) => { const capture = input.specialCards[card.id]; return <article key={card.id} className={`rounded-2xl border p-3 ${capture.doubled ? 'border-rose-400 bg-rose-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`}><div className="flex items-center gap-2"><span className={`text-2xl ${card.id.includes('Diamonds') ? 'text-red-500' : ''}`}>{card.symbol}</span><div className="min-w-0 flex-1"><strong className="block">{card.label}</strong><small className="muted">{card.value}{capture.doubled ? ' ×2' : ''}</small></div><button type="button" aria-pressed={capture.doubled} className={`min-h-11 rounded-xl px-3 text-xs font-black ${capture.doubled ? 'bg-rose-500 text-white' : 'bg-[var(--surface-elevated)]'}`} onClick={() => setCard(card.id, { doubled: !capture.doubled })}>×2 مدبل</button></div><div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">{players.map((player) => <OwnerButton key={player.id} name={player.name} active={capture.capturedBy === player.id} gold={card.id === 'tenDiamonds'} onClick={() => setCard(card.id, { capturedBy: player.id })}/>)}</div></article>; })}</div></section>
    <section className="rounded-2xl bg-[var(--surface-elevated)] p-3"><span className="eyebrow">معاينة الجولة</span><div className="mt-2 grid grid-cols-2 gap-2">{players.map((player) => <div key={player.id} className="flex items-center justify-between rounded-xl bg-[var(--surface)] p-3"><span className="truncate text-xs font-bold">{player.name}</span><b className={preview[player.id] < 0 ? 'text-red-500' : 'text-mint-600'}>{scoreText(preview[player.id])}</b></div>)}</div></section>
    {!validation.valid && <div className="rounded-2xl bg-amber-500/10 p-3 text-center text-xs font-bold text-amber-700 dark:text-amber-300">{validation.errors[0]}</div>}
    <Button className="w-full" size="lg" disabled={!validation.valid || saving} icon={<Check size={18}/>} onClick={submit}>{saving ? 'جاري الحفظ…' : submitLabel}</Button>
  </div>;
}

function TeamScoreCard({ team, names, total, delta, leader }: { team: GameTeam; names: string[]; total: number; delta: number; leader: boolean }) {
  return <article className={`min-w-0 rounded-2xl border p-3 text-center ${leader ? 'border-mint-500/50 bg-mint-500/10' : 'border-[var(--border)] bg-[var(--surface)]'}`}><strong className="block truncate text-sm">{team.name}</strong><small className="muted block truncate">{names.join(' + ')}</small><span className="mt-1 block text-2xl font-black tabular-nums">{scoreText(total)}</span><small className={delta < 0 ? 'text-red-500' : 'text-mint-600'}>{scoreText(delta)} هذه الجولة</small></article>;
}

function HeartCounter({ playerName, value, disabledPlus, onChange }: { playerName: string; value: number; disabledPlus: boolean; onChange: (value: number) => void }) {
  return <div className="mt-2 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-1"><button type="button" className="grid size-11 place-items-center rounded-xl bg-red-500/10 text-red-600 disabled:opacity-30" disabled={value === 0} onClick={() => onChange(value - 1)} aria-label={`إنقاص كوبا ${playerName}`}><Minus size={18}/></button><b className="text-center text-2xl tabular-nums">{value}</b><button type="button" className="grid size-11 place-items-center rounded-xl bg-rose-500/10 text-rose-600 disabled:opacity-30" disabled={disabledPlus} onClick={() => onChange(value + 1)} aria-label={`زيادة كوبا ${playerName}`}><Plus size={18}/></button></div>;
}

function OwnerButton({ name, active, gold, onClick }: { name: string; active: boolean; gold: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} className={`min-h-11 min-w-0 truncate rounded-xl border px-2 text-xs font-black ${active ? gold ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-mint-500 bg-mint-500 text-white' : 'border-[var(--border)] bg-[var(--surface)]'}`} onClick={onClick}>{name}</button>;
}
