import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { calculateTarneeb61Round, calculateTarneebRound, type TarneebRoundResult } from '../../games/tarneeb/scoring';
import type { GamePlayer, GameTeam, Tarneeb61RulesV2, TarneebRoundInput, TarneebScoringRules } from '../../types';
import { scoreText } from '../../utils';
import { Button } from '../common/Button';
import { Stepper } from '../common/Stepper';

type Props = { players: GamePlayer[]; teams: GameTeam[]; scores: Record<string, number>; rules: TarneebScoringRules | Tarneeb61RulesV2; initial?: TarneebRoundInput; onConfirm: (input: TarneebRoundInput, delta: Record<string, number>, result: TarneebRoundResult) => Promise<void>; submitLabel?: string };
const suits = [{ id: 'hearts', label: 'كبة', symbol: '♥', red: true }, { id: 'diamonds', label: 'ديناري', symbol: '♦', red: true }, { id: 'clubs', label: 'سباتي', symbol: '♣', red: false }, { id: 'spades', label: 'بستوني', symbol: '♠', red: false }] as const;

export function TarneebRoundEntry({ players, teams, scores, rules, initial, onConfirm, submitLabel = 'تأكيد الجولة' }: Props) {
  const [bidderId, setBidderId] = useState(initial?.bidderId ?? '');
  const [bid, setBid] = useState(initial?.bid ?? rules.minimumBid);
  const [teamOneTricks, setTeamOneTricks] = useState(initial?.teamOneTricks ?? 7);
  const [suit, setSuit] = useState<TarneebRoundInput['suit']>(initial?.suit);
  const [saving, setSaving] = useState(false);
  const bidderTeam = teams.find((team) => team.playerIds.includes(bidderId));
  const bidderIsTeamTwo = bidderTeam?.id === teams[1].id;
  const shownTricks = bidderIsTeamTwo ? 13 - teamOneTricks : teamOneTricks;
  const shownOpponent = bidderIsTeamTwo ? teams[0] : teams[1];
  const input = useMemo<TarneebRoundInput>(() => ({ bidderId, bidderTeamId: bidderTeam?.id ?? '', bid, teamOneTricks, suit }), [bidderId, bidderTeam, bid, teamOneTricks, suit]);
  const result = useMemo(() => {
    if (!bidderId || !bidderTeam) return undefined;
    return rules.version === 2 ? calculateTarneeb61Round(input, [teams[0].id, teams[1].id], rules) : calculateTarneebRound(input, [teams[0].id, teams[1].id], rules);
  }, [input, teams, rules, bidderId, bidderTeam]);
  const submit = async () => { if (!result || saving) return; setSaving(true); try { await onConfirm(input, result.delta, result); } finally { setSaving(false); } };
  return <div className="space-y-3"><section><p className="mb-2 font-black">مين ضمن؟</p><div className="grid grid-cols-2 gap-2">{players.map((player) => <button key={player.id} onClick={() => { setBidderId(player.id); const selectedTeam = teams.find((team) => team.playerIds.includes(player.id)); setTeamOneTricks(selectedTeam?.id === teams[1].id ? 6 : 7); }} className={`min-h-12 rounded-2xl border font-bold ${bidderId === player.id ? 'border-mint-500 bg-mint-500/10 text-mint-600' : 'border-slate-200 dark:border-white/10'}`}>{bidderId === player.id && <Check className="ms-1 inline" size={16}/>} {player.name}</button>)}</div></section>
    <section><p className="mb-2 font-black">قديش ضمن؟</p><div className="grid grid-cols-4 gap-2" dir="ltr">{Array.from({ length: rules.maximumBid - rules.minimumBid + 1 }, (_, index) => index + rules.minimumBid).map((value) => <button key={value} onClick={() => setBid(value)} className={`min-h-11 rounded-2xl border text-lg font-black ${bid === value ? 'border-mint-500 bg-mint-500 text-white' : 'border-slate-200 dark:border-white/10'} ${value >= 11 ? 'ring-1 ring-amber-400/40' : ''}`}>{value}</button>)}</div></section>
    {rules.version !== 2 && <section><p className="mb-2 font-black">الحكم <span className="muted font-normal">(اختياري)</span></p><div className="grid grid-cols-5 gap-2" dir="ltr">{suits.map((item) => <button key={item.id} aria-label={item.label} onClick={() => setSuit(item.id)} className={`min-h-12 rounded-2xl border text-2xl ${item.red ? 'text-red-500' : ''} ${suit === item.id ? 'border-mint-500 bg-mint-500/10' : 'border-slate-200 dark:border-white/10'}`}>{item.symbol}</button>)}<button onClick={() => setSuit(undefined)} className={`min-h-12 rounded-2xl border text-xs font-bold ${!suit ? 'border-mint-500 bg-mint-500/10' : 'border-slate-200 dark:border-white/10'}`}>بدون</button></div></section>}
    <section><Stepper label={`لطوش ${bidderTeam?.name ?? teams[0].name}`} value={shownTricks} max={13} onChange={(value) => setTeamOneTricks(bidderIsTeamTwo ? 13 - value : value)}/><p className="muted mt-1 text-center">{shownOpponent.name}: <strong>{13 - shownTricks}</strong> لطش</p></section>
    {result && <section className={`rounded-2xl p-4 ${result.contractSucceeded ? 'bg-mint-500/10' : 'bg-red-500/10'}`}><div className="mb-3 flex items-center justify-between"><strong>{result.contractSucceeded ? 'وفّى الضمان ✓' : 'انكسر'}</strong><span className="text-sm">محسوبة تلقائيًا</span></div>{teams.map((team) => <div key={team.id} className="flex items-center justify-between py-1"><span>{team.name}</span><span className="font-black tabular-nums">{scores[team.id] ?? 0} → {(scores[team.id] ?? 0) + result.delta[team.id]} <small className={result.delta[team.id] < 0 ? 'text-red-500' : 'text-mint-600'}>({scoreText(result.delta[team.id])})</small></span></div>)}</section>}
    <Button className="w-full" size="lg" disabled={!result || saving} onClick={submit}>{saving ? 'جارٍ الحفظ…' : submitLabel}</Button>
  </div>;
}
