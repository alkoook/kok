import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Check, Handshake, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { PlayerAvatar } from '../../components/common/PlayerAvatar';
import { useToast } from '../../components/common/toast-context';
import { createGame, db } from '../../db/database';
import { TARNEEB_41_RULES_V2, TARNEEB_61_RULES_V2 } from '../../games/tarneeb/rules';
import { DEFAULT_TRIX_RULES } from '../../games/trix/rules';
import type { GamePlayer, GameSession, GameTeam, GameType, RulesSnapshot, TrixMode, TrixRules } from '../../types';
import { GAME_LABELS, uid } from '../../utils';

const validTypes: GameType[] = ['trix-slow', 'trix-fast', 'cc', 'tarneeb-61', 'tarneeb-41'];
const targetOptions = [31, 41, 51, 61];

export function NewGamePage() {
  const { gameType: rawType } = useParams(); const gameType = rawType as GameType; const navigate = useNavigate(); const toast = useToast();
  const profiles = useLiveQuery(() => db.players.orderBy('lastPlayedAt').reverse().toArray(), [], []); const settings = useLiveQuery(() => db.settings.get('main')); const preset = useLiveQuery(() => validTypes.includes(gameType) ? db.presets.get(gameType) : undefined, [gameType]);
  const supportsMode = gameType === 'trix-fast' || gameType === 'trix-slow' || gameType === 'cc';
  const [mode, setMode] = useState<TrixMode>('partnership'); const [names, setNames] = useState(['', '', '', '']); const [firstOwner, setFirstOwner] = useState(0); const [teamNames, setTeamNames] = useState(['', '']); const [saving, setSaving] = useState(false); const [target, setTarget] = useState<number>(); const [customTarget, setCustomTarget] = useState('');
  const chosenTarget = target ?? settings?.preferredTarneebTarget ?? 61;
  const uniqueValid = useMemo(() => names.every((name) => name.trim()) && new Set(names.map((name) => name.trim().toLocaleLowerCase('ar'))).size === 4, [names]);
  if (!validTypes.includes(gameType)) return <Navigate to="/" replace/>;

  const selectProfile = (name: string) => { const empty = names.findIndex((value) => !value); if (empty >= 0 && !names.includes(name)) setNames((current) => current.map((value, index) => index === empty ? name : value)); };
  const start = async () => {
    if (!uniqueValid || saving || gameType === 'tarneeb-61' && (!Number.isInteger(chosenTarget) || chosenTarget <= 0)) return; setSaving(true);
    try {
      const now = new Date().toISOString(); const players: GamePlayer[] = names.map((name, seat) => { const profile = profiles.find((item) => item.name.toLocaleLowerCase('ar') === name.trim().toLocaleLowerCase('ar')); return { id: uid(), profileId: profile?.id, name: name.trim(), seat }; });
      const needsTeams = gameType.startsWith('tarneeb') || supportsMode && mode === 'partnership';
      const teams: GameTeam[] | undefined = needsTeams ? [{ id: uid(), name: teamNames[0].trim() || `${players[0].name} و${players[2].name}`, playerIds: [players[0].id, players[2].id] }, { id: uid(), name: teamNames[1].trim() || `${players[1].name} و${players[3].name}`, playerIds: [players[1].id, players[3].id] }] : undefined;
      let rulesSnapshot: RulesSnapshot;
      if (gameType === 'trix-fast') rulesSnapshot = { kind: 'fast-trix-v3', version: 3 }; else if (gameType === 'cc') rulesSnapshot = { kind: 'cc-v1', version: 1 }; else if (gameType === 'trix-slow') { const stored = preset?.rules && 'kingPenalty' in preset.rules ? preset.rules : DEFAULT_TRIX_RULES; rulesSnapshot = { kind: 'trix', version: 2, rules: { ...structuredClone(stored) as TrixRules, version: 2, doublingEnabled: true } }; } else if (gameType === 'tarneeb-61') rulesSnapshot = { kind: 'tarneeb-61-v2', version: 2, rules: { ...TARNEEB_61_RULES_V2, targetScore: chosenTarget } }; else rulesSnapshot = { kind: 'tarneeb-41-v2', version: 2, rules: structuredClone(TARNEEB_41_RULES_V2) };
      const scoreIds = gameType === 'tarneeb-61' ? teams!.map((team) => team.id) : players.map((player) => player.id);
      const game: GameSession = { id: uid(), gameType, status: 'active', players, teams, createdAt: now, updatedAt: now, currentRound: 0, scores: Object.fromEntries(scoreIds.map((id) => [id, 0])), rulesSnapshot, rulesVersion: gameType === 'trix-fast' ? 3 : gameType === 'cc' ? 1 : 2, trixMode: supportsMode ? mode : undefined, firstKingdomOwnerId: supportsMode ? players[firstOwner].id : undefined };
      await createGame(game); if (gameType === 'tarneeb-61') await db.settings.update('main', { preferredTarneebTarget: chosenTarget }); navigate(`/game/${game.id}`, { replace: true });
    } catch { setSaving(false); toast('تعذر إنشاء المباراة'); }
  };

  return <main className="page min-h-dvh"><header className="mb-5 flex items-center gap-3"><button className="grid size-11 place-items-center rounded-2xl bg-[var(--surface)]" onClick={() => navigate(-1)}><ArrowRight/></button><div><span className="eyebrow">إعداد سريع</span><h1 className="text-2xl font-black">{GAME_LABELS[gameType]}</h1></div></header>
    {supportsMode && <section className="surface mb-4 p-4"><h2 className="mb-3 font-black">طريقة اللعب</h2><div className="grid grid-cols-2 gap-2"><Mode active={mode === 'partnership'} icon={<Handshake/>} label="شراكة" onClick={() => setMode('partnership')}/><Mode active={mode !== 'partnership'} icon={<UserRound/>} label="يهودية" onClick={() => setMode('solo')}/></div></section>}
    {gameType === 'tarneeb-61' && <section className="surface mb-4 p-4"><h2 className="font-black">هدف المباراة</h2><p className="muted mb-3 text-xs">الهدف محفوظ داخل المباراة ولا يغيّر لعبة طرنيب 41 المستقلة.</p><div className="grid grid-cols-4 gap-2">{targetOptions.map((value) => <button key={value} className={`min-h-12 rounded-xl font-black ${chosenTarget === value ? 'bg-mint-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`} onClick={() => { setTarget(value); setCustomTarget(''); }}>{value}</button>)}</div><input className="field mt-2" type="number" min="1" inputMode="numeric" placeholder="هدف مخصص" value={customTarget} onChange={(event) => { setCustomTarget(event.target.value); setTarget(Number(event.target.value)); }}/></section>}
    <section className="surface mb-4 p-4"><h2 className="font-black">اللاعبون الأربعة</h2><p className="muted mb-3 text-xs">اختر دائمًا أو اكتب اسمًا مؤقتًا. زر الرقم يحدد صاحب أول مملكة.</p>{profiles.length > 0 && <div className="scrollbar-hidden mb-3 flex gap-2 overflow-x-auto">{profiles.map((profile) => <button key={profile.id} className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-100 p-2 pe-3 dark:bg-white/10" onClick={() => selectProfile(profile.name)}><PlayerAvatar name={profile.name} photo={profile.photo} size="sm"/><b className="text-sm">{profile.name}</b></button>)}</div>}<div className="space-y-2">{names.map((name, index) => <div key={index} className="flex items-center gap-2"><button className={`grid size-11 shrink-0 place-items-center rounded-xl font-black ${firstOwner === index ? 'bg-mint-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`} onClick={() => setFirstOwner(index)}>{firstOwner === index ? <Check size={18}/> : index + 1}</button><input className="field" value={name} onChange={(event) => setNames((current) => current.map((value, i) => i === index ? event.target.value : value))} placeholder={`اسم اللاعب ${index + 1}`}/></div>)}</div></section>
    {(gameType.startsWith('tarneeb') || supportsMode && mode === 'partnership') && <section className="surface mb-4 p-4"><h2 className="font-black">الشراكة</h2><p className="muted mb-3 text-xs">الأول مع الثالث، والثاني مع الرابع.</p><div className="grid grid-cols-2 gap-2"><input className="field" value={teamNames[0]} onChange={(event) => setTeamNames([event.target.value, teamNames[1]])} placeholder={`${names[0] || '1'} + ${names[2] || '3'}`}/><input className="field" value={teamNames[1]} onChange={(event) => setTeamNames([teamNames[0], event.target.value])} placeholder={`${names[1] || '2'} + ${names[3] || '4'}`}/></div></section>}
    <Button className="w-full" size="lg" disabled={!uniqueValid || saving || gameType === 'tarneeb-61' && chosenTarget <= 0} onClick={start}>{saving ? 'جارٍ البدء…' : 'ابدأ المباراة'}</Button></main>;
}

function Mode({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex min-h-20 items-center justify-center gap-2 rounded-2xl border font-black ${active ? 'border-mint-500 bg-mint-500/10 text-mint-700 dark:text-mint-300' : 'border-[var(--border)]'}`}>{icon}{label}</button>; }
