import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronLeft, Handshake, UserRound, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/toast-context';
import { createGame, db } from '../../db/database';
import { DEFAULT_TRIX_RULES } from '../../games/trix/rules';
import { TARNEEB_41_RULES_V2, TARNEEB_61_RULES_V2 } from '../../games/tarneeb/rules';
import type { GamePlayer, GameSession, GameTeam, GameType, RulesSnapshot, TrixMode, TrixRules } from '../../types';
import { GAME_LABELS, isTrix, uid } from '../../utils';

const validTypes: GameType[] = ['trix-slow', 'trix-fast', 'tarneeb-61', 'tarneeb-41'];

export function NewGamePage() {
  const { gameType: rawType } = useParams();
  const gameType = rawType as GameType;
  const navigate = useNavigate();
  const toast = useToast();
  const preset = useLiveQuery(() => validTypes.includes(gameType) ? db.presets.get(gameType) : undefined, [gameType]);
  const profiles = useLiveQuery(() => db.players.orderBy('lastPlayedAt').reverse().toArray(), [], []);
  const trix = isTrix(gameType);
  const [step, setStep] = useState(1);
  const [trixMode, setTrixMode] = useState<TrixMode>('individual');
  const [names, setNames] = useState(['', '', '', '']);
  const [firstOwner, setFirstOwner] = useState(0);
  const [teamNames, setTeamNames] = useState(['', '']);
  const [saving, setSaving] = useState(false);
  const uniqueValid = useMemo(() => names.every((name) => name.trim()) && new Set(names.map((name) => name.trim().toLocaleLowerCase('ar'))).size === 4, [names]);
  if (!validTypes.includes(gameType)) return <Navigate to="/" replace/>;

  const playersStep = trix ? 2 : 1;
  const finalStep = trix ? 3 : 2;
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target > 3) return;
    setNames((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
    if (firstOwner === index) setFirstOwner(target); else if (firstOwner === target) setFirstOwner(index);
  };

  const start = async () => {
    if (!uniqueValid || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const players: GamePlayer[] = names.map((name, seat) => ({ id: profiles.find((profile) => profile.name.toLocaleLowerCase('ar') === name.trim().toLocaleLowerCase('ar'))?.id ?? uid(), name: name.trim(), seat }));
      const needsTeams = !trix || trixMode === 'partnership';
      const teams: GameTeam[] | undefined = needsTeams ? [
        { id: uid(), name: teamNames[0].trim() || `${players[0].name} و${players[2].name}`, playerIds: [players[0].id, players[2].id] },
        { id: uid(), name: teamNames[1].trim() || `${players[1].name} و${players[3].name}`, playerIds: [players[1].id, players[3].id] }
      ] : undefined;
      let rulesSnapshot: RulesSnapshot;
      if (trix) {
        const storedRules = preset?.rules && 'kingPenalty' in preset.rules ? preset.rules : DEFAULT_TRIX_RULES;
        rulesSnapshot = { kind: 'trix', version: 2, rules: { ...structuredClone(storedRules) as TrixRules, version: 2, doublingEnabled: true } };
      } else if (gameType === 'tarneeb-61') rulesSnapshot = { kind: 'tarneeb-61-v2', version: 2, rules: structuredClone(TARNEEB_61_RULES_V2) };
      else rulesSnapshot = { kind: 'tarneeb-41-v2', version: 2, rules: structuredClone(TARNEEB_41_RULES_V2) };
      const scoreIds = gameType === 'tarneeb-41' || trix ? players.map((player) => player.id) : teams!.map((team) => team.id);
      const game: GameSession = {
        id: uid(), gameType, status: 'active', players, teams, createdAt: now, updatedAt: now, currentRound: 0,
        scores: Object.fromEntries(scoreIds.map((id) => [id, 0])), rulesSnapshot, rulesVersion: 2,
        trixMode: trix ? trixMode : undefined, firstKingdomOwnerId: trix ? players[firstOwner].id : undefined
      };
      await createGame(game);
      navigator.vibrate?.(20);
      navigate(`/game/${game.id}`, { replace: true });
    } catch { toast('تعذر إنشاء المباراة'); setSaving(false); }
  };

  return <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
    <header className="mb-4 flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)] shadow-soft" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} aria-label="رجوع"><ArrowRight size={20}/></button><div className="flex-1"><span className="eyebrow">إعداد {step} / {finalStep}</span><h1 className="text-xl font-black">{GAME_LABELS[gameType]}</h1></div><div className="flex gap-1">{Array.from({ length: finalStep }, (_, index) => <span key={index} className={`h-1.5 w-6 rounded-full ${index < step ? 'bg-mint-500' : 'bg-slate-200 dark:bg-white/10'}`}/>)}</div></header>

    {trix && step === 1 && <section className="flex flex-1 flex-col justify-center"><div className="mb-5 text-center"><span className="eyebrow">طريقة اللعب</span><h2 className="text-3xl font-black">كيف بدكم تلعبوا؟</h2></div><div className="grid grid-cols-2 gap-3"><ModeCard active={trixMode === 'individual'} icon={<UserRound size={30}/>} title="يهودية" subtitle="كل لاعب لحاله" onClick={() => setTrixMode('individual')}/><ModeCard active={trixMode === 'partnership'} icon={<Handshake size={30}/>} title="شراكة" subtitle="الأول مع الثالث" onClick={() => setTrixMode('partnership')}/></div><Button className="mt-6 w-full" size="lg" onClick={() => setStep(2)} icon={<ChevronLeft size={20}/>}>التالي</Button></section>}

    {step === playersStep && <section className="surface flex-1 p-4 sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-mint-500/10 text-mint-600"><Users size={21}/></div><div><h2 className="font-black">مين عم يلعب؟</h2><p className="muted text-xs">رتّبهم مثل قعدتهم حول الطاولة.</p></div></div><datalist id="players-list">{profiles.map((player) => <option key={player.id} value={player.name}/>)}</datalist><div className="space-y-2">{names.map((name, index) => <div key={index} className="flex items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-black dark:bg-white/10">{index + 1}</span><input className="field" list="players-list" value={name} onChange={(event) => setNames((current) => current.map((value, i) => i === index ? event.target.value : value))} placeholder={`اسم اللاعب ${index + 1}`} autoComplete="off"/><div className="flex shrink-0 flex-col"><button onClick={() => move(index, -1)} disabled={index === 0} className="grid size-7 place-items-center disabled:opacity-20" aria-label="تحريك للأعلى"><ArrowUp size={15}/></button><button onClick={() => move(index, 1)} disabled={index === 3} className="grid size-7 place-items-center disabled:opacity-20" aria-label="تحريك للأسفل"><ArrowDown size={15}/></button></div></div>)}</div>{profiles.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{profiles.slice(0, 8).map((profile) => <button key={profile.id} className="min-h-10 rounded-xl bg-slate-100 px-3 text-sm dark:bg-white/10" onClick={() => { const empty = names.findIndex((name) => !name); if (empty >= 0 && !names.includes(profile.name)) setNames((current) => current.map((value, i) => i === empty ? profile.name : value)); }}>{profile.name}</button>)}</div>}<Button className="mt-5 w-full" size="lg" disabled={!uniqueValid} onClick={() => setStep(finalStep)}>التالي</Button></section>}

    {step === finalStep && <section className="flex flex-1 flex-col"><div className="surface p-5"><h2 className="font-black">{trix ? 'جاهزين للمملكة الأولى' : gameType === 'tarneeb-41' ? 'كل لاعب يضمن ويسجل لحاله' : 'تأكيد الفرق'}</h2>{trix ? <><p className="muted mb-3 text-xs">اختر صاحب أول مملكة.</p><div className="grid grid-cols-2 gap-2">{names.map((name, index) => <button key={name} onClick={() => setFirstOwner(index)} aria-pressed={firstOwner === index} className={`min-h-12 rounded-2xl border font-bold ${firstOwner === index ? 'border-mint-500 bg-mint-500/10 text-mint-600' : 'border-slate-200 dark:border-white/10'}`}>{firstOwner === index && <Check className="ms-1 inline" size={16}/>} {name}</button>)}</div></> : <><p className="muted mb-4 text-xs">الأول مع الثالث، والثاني مع الرابع.</p><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><TeamPreview names={[names[0], names[2]]}/><b className="text-slate-300">ضد</b><TeamPreview names={[names[1], names[3]]}/></div><div className="mt-4 grid grid-cols-2 gap-2"><input className="field" placeholder="اسم الفريق الأول" value={teamNames[0]} onChange={(event) => setTeamNames([event.target.value, teamNames[1]])}/><input className="field" placeholder="اسم الفريق الثاني" value={teamNames[1]} onChange={(event) => setTeamNames([teamNames[0], event.target.value])}/></div></>}</div>{trixMode === 'partnership' && trix && <div className="mt-3 rounded-2xl bg-mint-500/10 p-4 text-sm font-bold">الشراكة: {names[0]} + {names[2]} ضد {names[1]} + {names[3]}</div>}<Button size="lg" className="mt-auto w-full" disabled={saving} onClick={start}>{saving ? 'جارٍ البدء…' : 'ابدأ المباراة'}</Button></section>}
  </main>;
}

function ModeCard({ active, icon, title, subtitle, onClick }: { active: boolean; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return <button onClick={onClick} aria-pressed={active} className={`min-h-44 rounded-3xl border p-5 text-right transition ${active ? 'border-mint-500 bg-mint-500/10 text-mint-700 dark:text-mint-300' : 'border-slate-200 bg-[var(--surface)] dark:border-white/10'}`}><span className="mb-8 grid size-12 place-items-center rounded-2xl bg-[var(--surface-elevated)]">{icon}</span><strong className="block text-xl">{title}</strong><span className="muted text-xs">{subtitle}</span></button>;
}
function TeamPreview({ names }: { names: string[] }) { return <div className="rounded-2xl bg-mint-500/10 p-3"><strong className="block">{names[0]}</strong><span>+</span><strong className="block">{names[1]}</strong></div>; }
