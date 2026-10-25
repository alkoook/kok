import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowRight, ArrowUp, Check, Crown, Handshake, Plus, Search, UserRound, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { PlayerAvatar } from '../../components/common/PlayerAvatar';
import { useToast } from '../../components/common/toast-context';
import { createGame, db } from '../../db/database';
import { TARNEEB_41_RULES_V2, TARNEEB_61_RULES_V2 } from '../../games/tarneeb/rules';
import { DEFAULT_TRIX_RULES } from '../../games/trix/rules';
import type { GamePlayer, GameSession, GameTeam, GameType, LikhaMode, PlayerProfile, RulesSnapshot, TrixMode, TrixRules } from '../../types';
import { GAME_LABELS, uid } from '../../utils';

const validTypes: GameType[] = ['trix-slow', 'trix-fast', 'cc', 'tarneeb-61', 'tarneeb-41', 'likha'];
const targetOptions = [31, 41, 51, 61];
const likhaLimitOptions = [100, 150, 210, 300];
type Seat = { key: string; name: string; profileId?: string; temporary: boolean };

export function NewGamePage() {
  const { gameType: rawType } = useParams();
  const gameType = rawType as GameType;
  const navigate = useNavigate();
  const toast = useToast();
  const profiles = useLiveQuery(async () => (await db.players.toArray()).sort((a, b) => (b.lastPlayedAt ?? b.updatedAt).localeCompare(a.lastPlayedAt ?? a.updatedAt)), [], []);
  const settings = useLiveQuery(() => db.settings.get('main'));
  const preset = useLiveQuery(() => validTypes.includes(gameType) ? db.presets.get(gameType) : undefined, [gameType]);
  const supportsMode = gameType === 'trix-fast' || gameType === 'trix-slow' || gameType === 'cc';
  const [mode, setMode] = useState<TrixMode>('partnership');
  const [likhaMode, setLikhaMode] = useState<LikhaMode>('individual');
  const [seats, setSeats] = useState<Array<Seat | undefined>>([undefined, undefined, undefined, undefined]);
  const [firstOwner, setFirstOwner] = useState(0);
  const [teamNames, setTeamNames] = useState(['', '']);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<number>();
  const [customTarget, setCustomTarget] = useState('');
  const [query, setQuery] = useState('');
  const [temporaryName, setTemporaryName] = useState('');
  const chosenTarget = target ?? (gameType === 'likha' ? 210 : settings?.preferredTarneebTarget ?? 61);
  const filled = seats.every(Boolean);
  const uniqueValid = useMemo(() => filled && new Set(seats.map((seat) => seat?.name.trim().toLocaleLowerCase('ar'))).size === 4, [filled, seats]);
  const filteredProfiles = profiles.filter((profile) => !query || profile.name.includes(query));
  if (!validTypes.includes(gameType)) return <Navigate to="/" replace/>;

  const assign = (seat: Seat) => {
    if (seat.profileId) {
      const selectedIndex = seats.findIndex((current) => current?.profileId === seat.profileId);
      if (selectedIndex >= 0) {
        setSeats((current) => current.map((value, index) => index === selectedIndex ? undefined : value));
        return;
      }
    }
    const empty = seats.findIndex((value) => !value);
    if (empty < 0) return;
    setSeats((current) => current.map((value, index) => index === empty ? seat : value));
  };
  const addTemporary = () => {
    const name = temporaryName.trim();
    if (!name || seats.some((seat) => seat?.name.toLocaleLowerCase('ar') === name.toLocaleLowerCase('ar'))) return;
    assign({ key: uid(), name, temporary: true });
    setTemporaryName('');
  };
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination > 3) return;
    setSeats((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    if (firstOwner === index) setFirstOwner(destination);
    else if (firstOwner === destination) setFirstOwner(index);
  };
  const start = async () => {
    if (!uniqueValid || saving || (gameType === 'tarneeb-61' || gameType === 'likha') && (!Number.isInteger(chosenTarget) || chosenTarget <= 0)) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const players: GamePlayer[] = seats.map((seat, index) => ({ id: uid(), profileId: seat?.profileId, name: seat!.name, seat: index }));
      const likhaPartnership = gameType === 'likha' && likhaMode === 'partnership';
      const needsTeams = gameType.startsWith('tarneeb') || supportsMode && mode === 'partnership' || likhaPartnership;
      const teamPairs: [[number, number], [number, number]] = likhaPartnership ? [[0, 1], [2, 3]] : [[0, 2], [1, 3]];
      const teamJoiner = likhaPartnership ? ' + ' : ' و';
      const teams: GameTeam[] | undefined = needsTeams ? [
        { id: uid(), name: teamNames[0].trim() || `${players[teamPairs[0][0]].name}${teamJoiner}${players[teamPairs[0][1]].name}`, playerIds: [players[teamPairs[0][0]].id, players[teamPairs[0][1]].id] },
        { id: uid(), name: teamNames[1].trim() || `${players[teamPairs[1][0]].name}${teamJoiner}${players[teamPairs[1][1]].name}`, playerIds: [players[teamPairs[1][0]].id, players[teamPairs[1][1]].id] }
      ] : undefined;
      let rulesSnapshot: RulesSnapshot;
      if (gameType === 'trix-fast') rulesSnapshot = { kind: 'fast-trix-v5', version: 5 };
      else if (gameType === 'cc') rulesSnapshot = { kind: 'cc-v3', version: 3 };
      else if (gameType === 'trix-slow') {
        const stored = preset?.rules && 'kingPenalty' in preset.rules ? preset.rules : DEFAULT_TRIX_RULES;
        rulesSnapshot = { kind: 'trix', version: 2, rules: { ...structuredClone(stored) as TrixRules, version: 2, doublingEnabled: true } };
      } else if (gameType === 'tarneeb-61') rulesSnapshot = { kind: 'tarneeb-61-v2', version: 2, rules: { ...TARNEEB_61_RULES_V2, targetScore: chosenTarget } };
      else if (gameType === 'tarneeb-41') rulesSnapshot = { kind: 'tarneeb-41-v2', version: 2, rules: structuredClone(TARNEEB_41_RULES_V2) };
      else rulesSnapshot = { kind: 'likha-v1', version: 1, rules: { version: 1, lossLimit: chosenTarget } };
      const teamScored = gameType === 'tarneeb-61' || (gameType === 'trix-fast' || gameType === 'cc') && mode === 'partnership';
      const scoreIds = teamScored ? teams!.map((team) => team.id) : players.map((player) => player.id);
      const game: GameSession = {
        id: uid(), gameType, status: 'active', players, teams, createdAt: now, updatedAt: now, currentRound: 0,
        scores: Object.fromEntries(scoreIds.map((id) => [id, 0])), rulesSnapshot,
        rulesVersion: gameType === 'trix-fast' ? 5 : gameType === 'cc' ? 3 : gameType === 'likha' ? 1 : 2,
        trixMode: supportsMode ? mode : undefined,
        likhaMode: gameType === 'likha' ? likhaMode : undefined,
        firstKingdomOwnerId: supportsMode ? players[firstOwner].id : undefined
      };
      await createGame(game);
      if (gameType === 'tarneeb-61') await db.settings.update('main', { preferredTarneebTarget: chosenTarget });
      navigate(`/game/${game.id}`, { replace: true });
    } catch {
      setSaving(false);
      toast('تعذر إنشاء المباراة');
    }
  };

  return <main className="page min-h-dvh">
    <header className="mb-5 flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)]" onClick={() => navigate(-1)}><ArrowRight/></button><div><span className="eyebrow">إعداد سريع</span><h1 className="text-2xl font-black">{GAME_LABELS[gameType]}</h1></div></header>
    {supportsMode && <section className="surface mb-4 p-4"><h2 className="mb-3 font-black">طريقة اللعب</h2><div className="grid grid-cols-2 gap-2"><Mode active={mode === 'partnership'} icon={<Handshake/>} label="شراكة" onClick={() => setMode('partnership')}/><Mode active={mode !== 'partnership'} icon={<UserRound/>} label="يهودية" onClick={() => setMode('solo')}/></div></section>}
    {gameType === 'likha' && <section className="surface mb-4 p-4"><h2 className="mb-1 font-black">طريقة الليخة</h2><p className="muted mb-3 text-xs">اليهودية لكل لاعب رصيد مستقل. بالشراكة نجمع رصيد كل شريكين رسمياً مع بقاء الورق منسوباً لآكله.</p><div className="grid grid-cols-2 gap-2"><Mode active={likhaMode === 'individual'} icon={<UserRound/>} label="يهودية" onClick={() => setLikhaMode('individual')}/><Mode active={likhaMode === 'partnership'} icon={<Handshake/>} label="شراكة" onClick={() => setLikhaMode('partnership')}/></div></section>}
    {gameType === 'tarneeb-61' && <section className="surface mb-4 p-4"><h2 className="font-black">هدف المباراة</h2><p className="muted mb-3 text-xs">الهدف محفوظ داخل المباراة ولا يغيّر لعبة طرنيب 41 المستقلة.</p><div className="grid grid-cols-4 gap-2">{targetOptions.map((value) => <button key={value} className={`min-h-12 rounded-xl font-black ${chosenTarget === value ? 'bg-mint-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`} onClick={() => { setTarget(value); setCustomTarget(''); }}>{value}</button>)}</div><input className="field mt-2" type="number" min="1" inputMode="numeric" placeholder="هدف مخصص" value={customTarget} onChange={(event) => { setCustomTarget(event.target.value); setTarget(Number(event.target.value)); }}/></section>}
    {gameType === 'likha' && <section className="surface mb-4 p-4"><h2 className="font-black">نهاية البرتية</h2><p className="muted mb-3 text-xs">تنتهي بعد الجولة التي يصل فيها أي لاعب إلى سالب الحد أو أقل.</p><div className="grid grid-cols-4 gap-2">{likhaLimitOptions.map((value) => <button key={value} className={`min-h-12 rounded-xl font-black ${chosenTarget === value ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`} onClick={() => { setTarget(value); setCustomTarget(''); }}>{value}</button>)}</div><input className="field mt-2" type="number" min="1" inputMode="numeric" placeholder="حد مخصص" value={customTarget} onChange={(event) => { setCustomTarget(event.target.value); setTarget(Number(event.target.value)); }}/></section>}
    <section className="surface mb-4 p-4">
      <div className="mb-3"><h2 className="font-black">المقاعد الأربعة</h2><p className="muted text-xs">اختر لاعبًا دائمًا أو أضف لاعبًا مؤقتًا، ثم رتّب المقاعد قبل البدء.</p></div>
      <div className="grid grid-cols-2 gap-2">{seats.map((seat, index) => <SeatCard key={index} index={index} seat={seat} profile={profiles.find((profile) => profile.id === seat?.profileId)} owner={firstOwner === index} allowOwner={supportsMode} onOwner={() => setFirstOwner(index)} onRemove={() => setSeats((current) => current.map((value, seatIndex) => seatIndex === index ? undefined : value))} onMove={move}/>)}</div>
      {profiles.length > 0 && <div className="mt-4"><label className="relative block"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="field pe-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن لاعب دائم"/></label><div data-testid="permanent-player-picker" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{filteredProfiles.map((profile) => { const selected = seats.some((seat) => seat?.profileId === profile.id); return <button key={profile.id} data-player-name={profile.name} aria-label={`${selected ? 'إزالة' : 'اختيار'} اللاعب ${profile.name}`} aria-pressed={selected} disabled={filled && !selected} className={`flex min-h-14 min-w-0 items-center gap-2 rounded-2xl border p-2 ${selected ? 'border-mint-500 bg-mint-500/10' : 'border-[var(--border)] bg-slate-100 dark:bg-white/5'} disabled:opacity-40`} onClick={() => assign({ key: profile.id, name: profile.name, profileId: profile.id, temporary: false })}><PlayerAvatar name={profile.name} photo={profile.photo} size="sm"/><b className="min-w-0 flex-1 truncate text-right text-sm">{profile.name}</b>{selected && <Check className="shrink-0" size={16}/>}</button>; })}</div></div>}
      <div className="mt-3 rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><span className="mb-2 block text-xs font-black">+ لاعب مؤقت</span><div className="flex gap-2"><input className="field" value={temporaryName} onChange={(event) => setTemporaryName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTemporary(); }} placeholder="اسم اللاعب المؤقت"/><Button size="sm" icon={<Plus/>} disabled={!temporaryName.trim() || filled} onClick={addTemporary}>إضافة</Button></div></div>
    </section>
    {(gameType.startsWith('tarneeb') || supportsMode && mode === 'partnership' || gameType === 'likha' && likhaMode === 'partnership') && <section className="surface mb-4 p-4"><h2 className="font-black">الشراكة واضحة قبل البدء</h2><div className="mt-3 grid grid-cols-2 gap-2"><TeamPreview label="الفريق A" seats={gameType === 'likha' ? [seats[0], seats[1]] : [seats[0], seats[2]]}/><TeamPreview label="الفريق B" seats={gameType === 'likha' ? [seats[2], seats[3]] : [seats[1], seats[3]]}/></div><p className="muted my-3 text-center text-xs">{gameType === 'likha' ? 'المقعد 1 + 2 ضد المقعد 3 + 4 — رتّب المقاعد لتحديد الشركاء' : 'المقعد 1 + 3 ضد المقعد 2 + 4'}</p><div className="grid grid-cols-2 gap-2"><input className="field" value={teamNames[0]} onChange={(event) => setTeamNames([event.target.value, teamNames[1]])} placeholder="اسم الفريق A (اختياري)"/><input className="field" value={teamNames[1]} onChange={(event) => setTeamNames([teamNames[0], event.target.value])} placeholder="اسم الفريق B (اختياري)"/></div></section>}
    <Button className="w-full" size="lg" disabled={!uniqueValid || saving || (gameType === 'tarneeb-61' || gameType === 'likha') && chosenTarget <= 0} onClick={start}>{saving ? 'جارٍ البدء…' : 'ابدأ المباراة'}</Button>
  </main>;
}

function SeatCard({ index, seat, profile, owner, allowOwner, onOwner, onRemove, onMove }: { index: number; seat?: Seat; profile?: PlayerProfile; owner: boolean; allowOwner: boolean; onOwner: () => void; onRemove: () => void; onMove: (index: number, direction: -1 | 1) => void }) {
  return <article data-testid={`seat-${index + 1}`} className={`relative min-h-32 rounded-2xl border p-3 ${seat ? 'border-mint-500/40 bg-mint-500/5' : 'border-dashed border-[var(--border)]'}`}>{allowOwner && <button type="button" aria-label={`صاحب أول مملكة المقعد ${index + 1}`} onClick={onOwner} className={`absolute left-2 top-2 grid size-8 place-items-center rounded-xl ${owner ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}><Crown size={15}/></button>}<span className="eyebrow">المقعد {index + 1}</span>{seat ? <><div className="mt-2 flex items-center gap-2"><PlayerAvatar name={seat.name} photo={profile?.photo} size="sm"/><div className="min-w-0"><strong className="block truncate">{seat.name}</strong><small className="muted">{seat.temporary ? 'مؤقت' : 'دائم'}</small></div></div><div className="mt-2 flex gap-1"><button aria-label={`تحريك المقعد ${index + 1} للأعلى`} disabled={index === 0} className="grid size-9 place-items-center rounded-lg bg-slate-100 disabled:opacity-30 dark:bg-white/10" onClick={() => onMove(index, -1)}><ArrowUp size={15}/></button><button aria-label={`تحريك المقعد ${index + 1} للأسفل`} disabled={index === 3} className="grid size-9 place-items-center rounded-lg bg-slate-100 disabled:opacity-30 dark:bg-white/10" onClick={() => onMove(index, 1)}><ArrowDown size={15}/></button><button aria-label={`إزالة ${seat.name}`} className="ms-auto grid size-9 place-items-center rounded-lg bg-red-500/10 text-red-500" onClick={onRemove}><X size={15}/></button></div></> : <p className="muted mt-7 text-center text-xs">اختر لاعبًا</p>}</article>;
}

function TeamPreview({ label, seats }: { label: string; seats: Array<Seat | undefined> }) { return <article className="rounded-2xl bg-slate-100 p-3 text-center dark:bg-white/5"><span className="eyebrow">{label}</span><strong className="mt-1 block text-sm">{seats.map((seat) => seat?.name || 'مقعد فارغ').join(' + ')}</strong></article>; }
function Mode({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex min-h-20 items-center justify-center gap-2 rounded-2xl border font-black ${active ? 'border-mint-500 bg-mint-500/10 text-mint-700 dark:text-mint-300' : 'border-[var(--border)]'}`}>{icon}{label}</button>; }
