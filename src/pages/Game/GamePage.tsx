import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Check, History, Home, MoreVertical, Pencil, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/toast-context';
import { TarneebScoreboard } from '../../components/score/TarneebScoreboard';
import { Tarneeb41Scoreboard } from '../../components/score/Tarneeb41Scoreboard';
import { TrixScoreboard } from '../../components/score/TrixScoreboard';
import { TarneebRoundEntry } from '../../components/tarneeb/TarneebRoundEntry';
import { Tarneeb41RoundEntry } from '../../components/tarneeb/Tarneeb41RoundEntry';
import { Tarneeb61Reaction } from '../../components/tarneeb/Tarneeb61Reaction';
import { TrixRoundEntry } from '../../components/trix/TrixRoundEntry';
import { addRound, createGame, db, replaceRound, undoLastRound } from '../../db/database';
import { FAST_CONTRACTS, SLOW_CONTRACTS, CONTRACT_LABELS, TRIX_QUEENS } from '../../games/trix/rules';
import { aggregatePartnershipScores } from '../../games/trix/scoring';
import { buildTarneeb61Attempts } from '../../games/tarneeb/analytics';
import { getContextualTarneeb61Reaction, type Tarneeb61Reaction as Tarneeb61ReactionData } from '../../games/tarneeb/reactions';
import type { TarneebRoundResult } from '../../games/tarneeb/scoring';
import { buildTarneebConditionalContext } from '../../games/reactions/contexts';
import { indexConditionalRules, selectConditionalReaction } from '../../games/reactions/conditionalRules';
import { interpolateTemplate } from '../../games/fast/messages';
import { useGame } from '../../hooks/useGame';
import type { ConditionalRuleFiring, GameRound, GameSession, ManualAdjustmentInput, Tarneeb41RoundInput, TarneebRoundInput, TrixContract, TrixRoundInput, TrixRules } from '../../types';
import { formatDuration, GAME_LABELS, isTrix, scoreText, uid } from '../../utils';
import { audioEngine } from '../../audio/audioEngine';
import type { AudioEvent } from '../../audio/types';
import { LikhaRoundEntry } from '../../components/likha/LikhaRoundEntry';
import { LikhaReaction } from '../../components/likha/LikhaReaction';
import { aggregateLikhaTeamScores, rankLikhaPlayers } from '../../games/likha/engine';
import { selectLikhaReaction, type LikhaReaction as LikhaReactionData } from '../../games/likha/reactions';
import type { LikhaRoundInput } from '../../types';

const LazyFastGamePanel = lazy(() => import('../../components/fast/FastGamePanel').then((module) => ({ default: module.FastGamePanel })));
const FastGamePanel = (props: { game: GameSession; rounds: GameRound[] }) => <Suspense fallback={<div className="mx-4 mt-4 surface h-80 animate-pulse"/>}><LazyFastGamePanel {...props}/></Suspense>;

export function GamePage() {
  const { gameId } = useParams();
  const { game, rounds } = useGame(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useLiveQuery(() => db.settings.get('main'));
  const conditionalRules = useLiveQuery(() => db.conditionalRules.toArray(), [], []);
  const conditionalFirings = useLiveQuery(() => gameId ? db.conditionalRuleFirings.where('gameId').equals(gameId).toArray() : Promise.resolve<ConditionalRuleFiring[]>([]), [gameId], []);
  const conditionalRuleIndex = useMemo(() => indexConditionalRules(conditionalRules), [conditionalRules]);
  const [selectedContract, setSelectedContract] = useState<TrixContract>();
  const [undoOpen, setUndoOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editRound, setEditRound] = useState<GameRound>();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [reaction, setReaction] = useState<(Tarneeb61ReactionData & { occurrence: number })>();
  const [likhaReaction, setLikhaReaction] = useState<{ reaction: LikhaReactionData; scores: Array<{ name: string; delta: number; total: number }> }>();
  const lastReactionByPlayer = useRef(new Map<string, string>());
  const lastReactionRoundId = useRef<string | undefined>(undefined);
  const lastLikhaReactionId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!settings?.keepAwake || !('wakeLock' in navigator)) return;
    let lock: { release: () => Promise<void> } | undefined;
    const acquire = () => { if (document.visibilityState === 'visible') (navigator as Navigator & { wakeLock: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen').then((value) => { lock = value; }).catch(() => undefined); };
    const visible = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire(); document.addEventListener('visibilitychange', visible);
    return () => { document.removeEventListener('visibilitychange', visible); lock?.release().catch(() => undefined); };
  }, [settings?.keepAwake]);

  if (game === undefined) return <main className="page"><div className="surface h-56 animate-pulse"/></main>;
  if (!game) return <main className="page text-center"><p>المباراة غير موجودة.</p><Link to="/">العودة للرئيسية</Link></main>;
  const lastRound = rounds.at(-1);
  const saveFeedback = () => { if (settings?.vibration) navigator.vibrate?.(18); toast('تم تسجيل الجولة'); setSelectedContract(undefined); };

  const saveTrix = async (input: TrixRoundInput, delta: Record<string, number>, kingdomIndex: number, ownerId: string) => {
    if (editRound) { await replaceRound(editRound.id, { input, scoreDelta: delta, type: input.contract, note: editRound.note }); setEditRound(undefined); toast('تم تعديل الجولة وإعادة الحساب'); }
    else { await addRound({ gameId: game.id, type: input.contract, kingdomIndex, kingdomOwnerId: ownerId, input, scoreDelta: delta }); const updated = await db.games.get(game.id); const contractsPerKingdom = game.gameType === 'trix-slow' ? SLOW_CONTRACTS.length : FAST_CONTRACTS.length; const completedKingdom = (rounds.filter((round) => round.type !== 'manual-adjustment').length + 1) % contractsPerKingdom === 0; if (updated?.status === 'completed') void audioEngine.playEvent('match-complete'); else if (completedKingdom) void audioEngine.playEvent('kingdom-complete'); else if (input.contract === 'trix') { const position = input.order.indexOf(ownerId) + 1; void audioEngine.playEvent(position === 1 ? 'trix-first' : position === 4 ? 'trix-last' : 'round-saved'); } else void audioEngine.playEvent('round-saved'); saveFeedback(); }
  };
  const saveTarneeb = async (input: TarneebRoundInput, delta: Record<string, number>, result: TarneebRoundResult) => {
    if (editRound) { await replaceRound(editRound.id, { input, scoreDelta: delta, type: 'tarneeb', note: input.note }); setEditRound(undefined); toast('تم تعديل الجولة وإعادة الحساب'); }
    else {
      const savedRound = await addRound({ gameId: game.id, type: 'tarneeb', input, scoreDelta: delta, note: input.note });
      if (settings?.vibration) navigator.vibrate?.(18);
      if (game.rulesSnapshot.kind === 'tarneeb-61-v2' && game.teams) {
        const actualTricks = input.bidderTeamId === game.teams[0].id ? input.teamOneTricks : 13 - input.teamOneTricks;
        if (lastReactionRoundId.current === savedRound.id) return;
        lastReactionRoundId.current = savedRound.id;
        const previousId = lastReactionByPlayer.current.get(input.bidderId);
        const attempts = buildTarneeb61Attempts(game, [...rounds, savedRound]);
        let nextReaction = getContextualTarneeb61Reaction({ playerId: input.bidderId, bid: input.bid, actualTricks, contractSucceeded: result.contractSucceeded }, attempts, previousId);
        const semanticReactionId = nextReaction.id;
        const conditionalContext = buildTarneebConditionalContext(game, savedRound, input, result, attempts, settings?.roastIntensity ?? 4);
        const conditional = selectConditionalReaction(conditionalRuleIndex.get('tarneeb-61:tarneeb') ?? [], conditionalContext, conditionalFirings);
        const { effectiveMessageRules, pickMessage, readRecentMessageIds, rememberMessageId } = await import('../../games/fast/messages');
        const effective = effectiveMessageRules(await db.messageRules.toArray());
        const special = ['kaboot', 'broken-seven', 'second-kaboot', 'success-streak-3', 'success-streak-5', 'failure-streak-3'].includes(nextReaction.id);
        const candidates = special
          ? effective.filter((rule) => rule.enabled && rule.category === 'tarneeb-special' && rule.factoryId === nextReaction.id)
          : effective.filter((rule) => rule.enabled && rule.category === (result.contractSucceeded ? 'tarneeb-success' : 'tarneeb-failure'));
        const factoryOverride = pickMessage(candidates, [...readRecentMessageIds(), previousId ?? '']);
        const selectedConditional = conditional && (conditional.rule.exclusive || !special) ? conditional : undefined;
        if (selectedConditional) {
          const firedAt = new Date().toISOString();
          await db.conditionalRuleFirings.add({ id: uid(), ruleId: selectedConditional.rule.id, gameId: game.id, event: 'tarneeb', alternativeId: selectedConditional.alternative.id, roundIndex: savedRound.index, firedAt });
          nextReaction = { ...nextReaction, id: selectedConditional.alternative.id, message: interpolateTemplate(selectedConditional.alternative.text, conditionalContext.placeholders), durationMs: selectedConditional.rule.durationMs };
        } else if (factoryOverride) {
          rememberMessageId(factoryOverride.id, factoryOverride.template);
          nextReaction = { ...nextReaction, id: factoryOverride.id, message: factoryOverride.template, durationMs: factoryOverride.durationMs };
        }
        const updated = await db.games.get(game.id);
        const audioEvent: AudioEvent = updated?.status === 'completed' ? 'match-complete' : semanticReactionId === 'broken-seven' ? 'broken-seven' : semanticReactionId === 'second-kaboot' ? 'second-kaboot' : nextReaction.variant === 'kaboot' ? 'kaboot' : semanticReactionId.startsWith('success-streak') ? 'success-streak' : semanticReactionId === 'failure-streak-3' ? 'failure-streak' : result.contractSucceeded ? 'contract-success' : 'contract-failure';
        void audioEngine.playReaction({ event: audioEvent, message: nextReaction.message, mode: selectedConditional?.rule.audioPlaybackMode, assetId: selectedConditional?.rule.audioAssetId });
        lastReactionByPlayer.current.set(input.bidderId, nextReaction.id);
        if (settings?.roundReactions !== false) setReaction({ ...nextReaction, occurrence: savedRound.index });
      } else toast('تم تسجيل الجولة');
    }
  };
  const saveTarneeb41 = async (input: Tarneeb41RoundInput, delta: Record<string, number>) => {
    if (editRound) { await replaceRound(editRound.id, { input, scoreDelta: delta, type: 'tarneeb-41', note: editRound.note }); setEditRound(undefined); toast('تم تعديل الجولة وإعادة بناء المراحل'); }
    else { await addRound({ gameId: game.id, type: 'tarneeb-41', input, scoreDelta: delta }); const updated = await db.games.get(game.id); void audioEngine.playEvent(updated?.status === 'completed' ? 'match-complete' : 'round-saved'); saveFeedback(); }
  };
  const saveLikha = async (input: LikhaRoundInput, delta: Record<string, number>) => {
    if (editRound) { await replaceRound(editRound.id, { input, scoreDelta: delta, type: 'likha', note: editRound.note }); setEditRound(undefined); setLikhaReaction(undefined); toast('تم تعديل الجولة وإعادة حساب الليخة'); return; }
    const saved = await addRound({ gameId: game.id, type: 'likha', input, scoreDelta: delta });
    const capturePlayerId = input.specialCards.queenSpades.capturedBy;
    const partnerId = game.likhaMode === 'partnership' ? game.teams?.find((team) => team.playerIds.includes(capturePlayerId))?.playerIds.find((id) => id !== capturePlayerId) : undefined;
    const selected = selectLikhaReaction(input, saved.scoreDelta, lastLikhaReactionId.current, game.players.find((player) => player.id === partnerId)?.name); lastLikhaReactionId.current = selected.id;
    const updated = await db.games.get(game.id); void audioEngine.playEvent(updated?.status === 'completed' ? 'match-complete' : 'round-saved');
    if (settings?.vibration) navigator.vibrate?.(selected.tone === 'disaster' ? [25, 40, 25] : 18);
    if (settings?.roundReactions !== false) setLikhaReaction({ reaction: selected, scores: game.players.map((player) => ({ name: player.name, delta: saved.scoreDelta[player.id] ?? 0, total: saved.scoreAfter[player.id] ?? 0 })) });
    else toast('تم تسجيل الجولة');
  };

  return <main className="scrollbar-hidden mx-auto min-h-dvh w-full max-w-3xl pb-[calc(6rem+env(safe-area-inset-bottom))]">
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[color:var(--bg)]/90 px-4 py-3 backdrop-blur-xl dark:border-white/10"><div className="flex items-center justify-between"><button className="grid size-11 place-items-center rounded-2xl" onClick={() => navigate('/')} aria-label="الرئيسية"><ArrowRight size={21}/></button><div className="text-center"><h1 className="font-black">{game.rulesSnapshot.kind === 'tarneeb-61-v2' ? `طرنيب — الهدف ${game.rulesSnapshot.rules.targetScore}` : GAME_LABELS[game.gameType]}</h1><span className="flex items-center justify-center gap-1 text-xs text-mint-600"><Check size={13}/> محفوظ</span></div><button className="grid size-11 place-items-center rounded-2xl" onClick={() => setMenuOpen(true)} aria-label="قائمة المباراة"><MoreVertical size={21}/></button></div></header>
    {reaction && game.gameType === 'tarneeb-61' && <Tarneeb61Reaction key={reaction.occurrence} reaction={reaction} onDismiss={() => setReaction(undefined)}/>}
    {likhaReaction && game.gameType === 'likha' && <LikhaReaction key={`${likhaReaction.reaction.id}-${rounds.length}`} reaction={likhaReaction.reaction} playerName={game.players.find((player) => player.id === likhaReaction.reaction.playerId)?.name ?? 'لاعب'} scores={likhaReaction.scores} onDismiss={() => setLikhaReaction(undefined)}/>}
    {game.gameType === 'likha' && game.rulesSnapshot.kind === 'likha-v1' ? game.status === 'completed' ? <LikhaWinner game={game} rounds={rounds} onUndo={() => setUndoOpen(true)} onHistory={() => setHistoryOpen(true)}/> : <LikhaActive game={game} rounds={rounds} onSave={saveLikha}/> : (game.rulesSnapshot.kind === 'fast-trix-v3' || game.rulesSnapshot.kind === 'fast-trix-v4' || game.rulesSnapshot.kind === 'fast-trix-v5' || game.rulesSnapshot.kind === 'cc-v1' || game.rulesSnapshot.kind === 'cc-v2' || game.rulesSnapshot.kind === 'cc-v3') ? <FastGamePanel game={game} rounds={rounds}/> : game.status === 'completed' ? <Winner game={game} rounds={rounds} onUndo={() => setUndoOpen(true)} onHistory={() => setHistoryOpen(true)}/> : isTrix(game.gameType)
      ? <TrixActive game={game} rounds={rounds} selectedContract={selectedContract} setSelectedContract={setSelectedContract} onSave={saveTrix}/>
      : game.gameType === 'tarneeb-41' && game.rulesSnapshot.kind === 'tarneeb-41-v2' ? <Tarneeb41Active game={game} rounds={rounds} onSave={saveTarneeb41}/> : <TarneebActive game={game} rounds={rounds} onSave={saveTarneeb}/>} 
    {game.status === 'active' && <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-3xl border-t border-slate-200 bg-[color:var(--surface)]/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-white/10"><div className="grid grid-cols-2 gap-2"><Button variant="secondary" disabled={!lastRound} icon={<Undo2 size={18}/>} onClick={() => setUndoOpen(true)}>تراجع</Button><Button variant="secondary" icon={<History size={18}/>} onClick={() => setHistoryOpen(true)}>سجل الجولات</Button></div></div>}

    <Modal open={undoOpen} title="التراجع عن آخر جولة؟" onClose={() => setUndoOpen(false)}>{lastRound && <><p className="text-lg font-bold">{roundTitle(lastRound, game)}</p>{trixRoundDetails(lastRound, game).length > 0 && <div className="muted mb-5 mt-2 space-y-1 text-xs">{trixRoundDetails(lastRound, game).map((detail) => <p key={detail}>{detail}</p>)}</div>}<div className="mt-5 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => setUndoOpen(false)}>إلغاء</Button><Button variant="danger" onClick={async () => { await undoLastRound(game.id); setReaction(undefined); setUndoOpen(false); toast('تم التراجع عن الجولة'); }}>تراجع</Button></div></>}</Modal>
    <Modal open={historyOpen} title="سجل الجولات" onClose={() => setHistoryOpen(false)}><RoundTimeline game={game} rounds={rounds} onEdit={(round) => { setEditRound(round); setHistoryOpen(false); }}/></Modal>
    <Modal open={menuOpen} title="خيارات المباراة" onClose={() => setMenuOpen(false)}><div className="space-y-2"><Link className="flex min-h-12 items-center gap-3 rounded-2xl bg-slate-100 px-4 font-bold dark:bg-white/5" to={`/details/${game.id}`}><History size={19}/> تفاصيل المباراة</Link>{game.status === 'active' && <button className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 font-bold dark:bg-white/5" onClick={() => { setMenuOpen(false); setAdjustmentOpen(true); }}><Pencil size={19}/> تصحيح النقاط يدويًا</button>}<Link className="flex min-h-12 items-center gap-3 rounded-2xl bg-slate-100 px-4 font-bold dark:bg-white/5" to="/"><Home size={19}/> المباراة محفوظة — العودة</Link></div></Modal>
    <Modal open={adjustmentOpen} title="تصحيح النقاط" onClose={() => setAdjustmentOpen(false)}><ManualAdjustment game={game} onSave={async (input, delta) => { await addRound({ gameId: game.id, type: 'manual-adjustment', input, scoreDelta: delta, note: input.reason }); setAdjustmentOpen(false); toast('تم تسجيل التصحيح'); }}/></Modal>
    <Modal open={Boolean(editRound)} title="تعديل النتيجة" onClose={() => setEditRound(undefined)}>{editRound && (game.gameType === 'likha' && editRound.type === 'likha' ? <LikhaRoundEntry key={editRound.id} players={game.players} scores={rounds[editRound.index - 1]?.scoreAfter ?? Object.fromEntries(game.players.map((player) => [player.id, 0]))} teams={game.teams} mode={game.likhaMode ?? 'individual'} initial={editRound.input as LikhaRoundInput} onConfirm={saveLikha} submitLabel="حفظ التعديل"/> : isTrix(game.gameType) && game.rulesSnapshot.kind === 'trix' && editRound.type !== 'manual-adjustment' ? <TrixRoundEntry key={editRound.id} contract={editRound.type as TrixContract} players={game.players} teams={game.teams} mode={game.trixMode} rules={game.rulesSnapshot.rules} initial={editRound.input as TrixRoundInput} onConfirm={(input, delta) => saveTrix(input, delta, editRound.kingdomIndex ?? 0, editRound.kingdomOwnerId ?? '')} submitLabel="حفظ التعديل"/> : game.gameType === 'tarneeb-41' && game.teams && game.rulesSnapshot.kind === 'tarneeb-41-v2' && editRound.type === 'tarneeb-41' ? <Tarneeb41RoundEntry key={editRound.id} players={game.players} teams={game.teams} scores={rounds[editRound.index - 1]?.scoreAfter ?? Object.fromEntries(game.players.map((player) => [player.id, 0]))} rules={game.rulesSnapshot.rules} initial={editRound.input as Tarneeb41RoundInput} onConfirm={saveTarneeb41} submitLabel="حفظ التعديل"/> : !isTrix(game.gameType) && game.teams && (game.rulesSnapshot.kind === 'tarneeb' || game.rulesSnapshot.kind === 'tarneeb-61-v2') && editRound.type === 'tarneeb' ? <TarneebRoundEntry key={editRound.id} players={game.players} teams={game.teams} scores={rounds[editRound.index - 1]?.scoreAfter ?? Object.fromEntries(game.teams.map((team) => [team.id, 0]))} rules={game.rulesSnapshot.rules} initial={editRound.input as TarneebRoundInput} onConfirm={saveTarneeb} submitLabel="حفظ التعديل"/> : <p className="muted">يمكن التراجع عن التصحيح ثم تسجيله مجددًا.</p>)}</Modal>
  </main>;
}

function TrixActive({ game, rounds, selectedContract, setSelectedContract, onSave }: { game: GameSession; rounds: GameRound[]; selectedContract?: TrixContract; setSelectedContract: (value?: TrixContract) => void; onSave: (input: TrixRoundInput, delta: Record<string, number>, kingdom: number, owner: string) => Promise<void> }) {
  if (game.rulesSnapshot.kind !== 'trix') return null;
  const contracts = game.gameType === 'trix-slow' ? SLOW_CONTRACTS : FAST_CONTRACTS;
  const played = rounds.filter((round) => round.type !== 'manual-adjustment');
  const kingdomIndex = Math.min(3, Math.floor(played.length / contracts.length));
  const firstIndex = Math.max(0, game.players.findIndex((player) => player.id === game.firstKingdomOwnerId));
  const owner = game.players[(firstIndex + kingdomIndex) % 4];
  const kingdomRounds = played.filter((round) => round.kingdomIndex === kingdomIndex);
  const remaining = contracts.filter((contract) => !kingdomRounds.some((round) => round.type === contract));
  const total = contracts.length * 4;
  return <div className="px-4 py-5"><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow">مملكة {owner.name}</span><h2 className="text-2xl font-black">الجولة {played.length + 1} من {total}</h2></div><span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold shadow-sm">{remaining.length} متبقية</span></div><TrixScoreboard players={game.players} scores={game.scores} ownerId={owner.id} mode={game.trixMode} teams={game.teams}/>
    <section className="mt-5"><h2 className="mb-3 text-lg font-black">اختار التسمية</h2><div className="grid grid-cols-2 gap-3">{contracts.map((contract) => { const done = !remaining.includes(contract); return <button key={contract} disabled={done} onClick={() => setSelectedContract(contract)} className={`min-h-20 rounded-3xl border p-3 text-right transition ${done ? 'border-transparent bg-mint-500/10 text-mint-600' : selectedContract === contract ? 'border-mint-500 bg-mint-500/10' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-surface'}`}><span className="font-black">{done ? '✓ ' : ''}{CONTRACT_LABELS[contract]}</span><small className="muted mt-1 block">{done ? 'تم تسجيلها' : 'اضغط للتسجيل'}</small></button>; })}</div></section>
    {kingdomIndex > 0 && <div className="mt-3 rounded-2xl bg-mint-500/10 p-3 text-center text-sm font-black text-mint-700 dark:text-mint-300">توازن المملكة السابقة ✓ · المجموع 0</div>}
    <Modal open={Boolean(selectedContract)} title={selectedContract ? CONTRACT_LABELS[selectedContract] : ''} onClose={() => setSelectedContract(undefined)}>{selectedContract && <TrixRoundEntry key={`${selectedContract}-${kingdomIndex}`} contract={selectedContract} players={game.players} teams={game.teams} mode={game.trixMode} rules={game.rulesSnapshot.rules as TrixRules} onConfirm={(input, delta) => onSave(input, delta, kingdomIndex, owner.id)}/>}</Modal>
  </div>;
}

function TarneebActive({ game, rounds, onSave }: { game: GameSession; rounds: GameRound[]; onSave: (input: TarneebRoundInput, delta: Record<string, number>, result: TarneebRoundResult) => Promise<void> }) {
  if (!game.teams || (game.rulesSnapshot.kind !== 'tarneeb' && game.rulesSnapshot.kind !== 'tarneeb-61-v2')) return null;
  return <div className="px-4 py-5"><div className="mb-4 flex items-end justify-between"><div><span className="eyebrow">الجولة القادمة</span><h2 className="text-2xl font-black">جولة {rounds.filter((round) => round.type === 'tarneeb').length + 1}</h2></div></div><TarneebScoreboard teams={game.teams} scores={game.scores} target={game.rulesSnapshot.rules.targetScore}/>{game.winnerIds && game.winnerIds.length > 1 && <div className="mt-4 rounded-2xl bg-amber-500/10 p-4 font-bold text-amber-700 dark:text-amber-300">تعادل حسب القواعد الحالية — يمكنكم متابعة اللعب.</div>}<section className="surface mt-4 p-4 sm:p-6"><TarneebRoundEntry players={game.players} teams={game.teams} scores={game.scores} rules={game.rulesSnapshot.rules} onConfirm={onSave}/></section></div>;
}

function Tarneeb41Active({ game, rounds, onSave }: { game: GameSession; rounds: GameRound[]; onSave: (input: Tarneeb41RoundInput, delta: Record<string, number>) => Promise<void> }) {
  if (!game.teams || game.rulesSnapshot.kind !== 'tarneeb-41-v2') return null;
  return <div className="px-4 py-3"><div className="mb-2 flex items-end justify-between"><div><span className="eyebrow">ضمان فردي</span><h2 className="text-lg font-black">جولة {rounds.filter((round) => round.type === 'tarneeb-41').length + 1}</h2></div><span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold">الهدف 41</span></div><Tarneeb41Scoreboard players={game.players} teams={game.teams} scores={game.scores}/><section className="surface mt-2 p-3"><Tarneeb41RoundEntry players={game.players} teams={game.teams} scores={game.scores} rules={game.rulesSnapshot.rules} onConfirm={onSave}/></section></div>;
}

function LikhaActive({ game, rounds, onSave }: { game: GameSession; rounds: GameRound[]; onSave: (input: LikhaRoundInput, delta: Record<string, number>) => Promise<void> }) {
  if (game.rulesSnapshot.kind !== 'likha-v1') return null;
  const partnership = game.likhaMode === 'partnership' && game.teams?.length === 2;
  const official = partnership ? aggregateLikhaTeamScores(game.scores, game.teams!) : game.scores;
  const scoreTargets = partnership ? game.teams! : game.players;
  return <div className="px-3 py-4"><div className="mb-3 flex items-end justify-between"><div><span className="eyebrow">أربعة لاعبين · {partnership ? 'شراكة' : 'حساب فردي'}</span><h2 className="text-xl font-black">جولة {rounds.filter((round) => round.type === 'likha').length + 1}</h2></div><span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-black text-rose-600">النهاية −{game.rulesSnapshot.rules.lossLimit}</span></div><div className="mb-3 grid grid-cols-2 gap-2">{scoreTargets.map((target) => <div key={target.id} className="surface min-w-0 p-3"><span className="muted block truncate text-xs">{target.name}</span><strong className={`text-2xl tabular-nums ${(official[target.id] ?? 0) < 0 ? 'text-red-500' : 'text-mint-600'}`}>{scoreText(official[target.id] ?? 0)}</strong>{partnership && <small className="muted block truncate">{game.teams?.find((team) => team.id === target.id)?.playerIds.map((id) => game.players.find((player) => player.id === id)?.name).join(' + ')}</small>}</div>)}</div><section className="surface p-3 sm:p-5"><LikhaRoundEntry players={game.players} scores={game.scores} teams={game.teams} mode={game.likhaMode ?? 'individual'} onConfirm={onSave}/></section></div>;
}

function LikhaWinner({ game, rounds, onUndo, onHistory }: { game: GameSession; rounds: GameRound[]; onUndo: () => void; onHistory: () => void }) {
  const partnership = game.likhaMode === 'partnership' && game.teams?.length === 2;
  const officialScores = partnership ? aggregateLikhaTeamScores(game.scores, game.teams!) : game.scores;
  const ranking = rankLikhaPlayers(officialScores); const likhaRounds = rounds.filter((round) => round.type === 'likha');
  const queenCounts = Object.fromEntries(game.players.map((player) => [player.id, 0])); const tenCounts = { ...queenCounts }; let worst: { playerId: string; score: number; round: number } | undefined;
  likhaRounds.forEach((round) => { const input = round.input as LikhaRoundInput; queenCounts[input.specialCards.queenSpades.capturedBy] += 1; tenCounts[input.specialCards.tenDiamonds.capturedBy] += 1; Object.entries(round.scoreDelta).forEach(([playerId, score]) => { if (!worst || score < worst.score) worst = { playerId, score, round: round.index + 1 }; }); });
  const queenMagnet = [...game.players].sort((a, b) => queenCounts[b.id] - queenCounts[a.id])[0]; const tenHunter = [...game.players].sort((a, b) => tenCounts[b.id] - tenCounts[a.id])[0]; const name = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? '';
  return <div className="px-4 py-6"><section className="surface overflow-hidden"><div className="bg-gradient-to-b from-rose-500/15 via-amber-500/5 to-transparent p-6 text-center"><div className="mx-auto mb-3 grid size-20 place-items-center rounded-full bg-amber-400 text-slate-950 shadow-xl"><Trophy size={38}/></div><span className="eyebrow">{ranking.filter((entry) => entry.winner).length > 1 ? 'تعادل حقيقي' : 'الفائز بالليخة'}</span><h2 className="mt-1 text-3xl font-black">{ranking.filter((entry) => entry.winner).map((entry) => name(entry.playerId)).join(' و ')}</h2><p className="muted mt-1">{likhaRounds.length} جولات · النهاية عند −{game.rulesSnapshot.kind === 'likha-v1' ? game.rulesSnapshot.rules.lossLimit : 210}</p></div><div className="mx-4 space-y-2">{ranking.map((entry) => <div key={entry.playerId} className={`flex items-center gap-3 rounded-2xl p-3 ${entry.winner ? 'bg-amber-400/15' : entry.rank === ranking.length ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-white/5'}`}><span className="text-xl">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '💀'}</span><strong className="min-w-0 flex-1 truncate">{name(entry.playerId)}</strong><b className="text-xl tabular-nums">{scoreText(entry.score)}</b></div>)}</div><div className="m-4 grid gap-2 sm:grid-cols-3">{queenCounts[queenMagnet.id] > 0 && <Highlight emoji="👸" label="مغناطيس البنت" value={`${queenMagnet.name} ×${queenCounts[queenMagnet.id]}`}/>} {tenCounts[tenHunter.id] > 0 && <Highlight emoji="♦" label="صياد العشرة" value={`${tenHunter.name} ×${tenCounts[tenHunter.id]}`}/>} {worst && <Highlight emoji="☠️" label="أقسى جولة" value={`${name(worst.playerId)} ${scoreText(worst.score)} · ج${worst.round}`}/>}</div><div className="grid gap-2 p-4 pt-0"><ReplayButton game={game}/><div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={onHistory}>سجل الجولات</Button><Button variant="secondary" icon={<Undo2 size={17}/>} onClick={onUndo}>تراجع</Button></div><Link className="flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 font-bold dark:bg-white/10" to={`/details/${game.id}`}>تفاصيل المباراة</Link></div></section></div>;
}

function Highlight({ emoji, label, value }: { emoji: string; label: string; value: string }) { return <article className="rounded-2xl border border-[var(--border)] p-3"><span className="text-xl">{emoji}</span><small className="muted mt-1 block">{label}</small><strong className="block">{value}</strong></article>; }

function Winner({ game, rounds, onUndo, onHistory }: { game: GameSession; rounds: GameRound[]; onUndo: () => void; onHistory: () => void }) {
  const winners = game.winnerIds?.map((id) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name).filter(Boolean) ?? [];
  const displayedScores = isTrix(game.gameType) && game.trixMode === 'partnership' && game.teams
    ? game.teams.map((team) => [team.id, team.playerIds.reduce((sum, id) => sum + (game.scores[id] ?? 0), 0)] as [string, number])
    : Object.entries(game.scores);
  const sorted = displayedScores.sort((a, b) => b[1] - a[1]);
  return <div className="px-4 py-8"><section className="surface overflow-hidden text-center"><div className="bg-gradient-to-b from-mint-500/20 to-transparent p-7"><div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-mint-500 text-white shadow-xl shadow-mint-500/25"><Trophy size={38}/></div><span className="eyebrow">الفائز</span><h2 className="mt-1 text-3xl font-black">{winners.join(' و ') || 'انتهت المباراة'}</h2><p className="muted mt-2">{rounds.length} جولة · {formatDuration(game.createdAt, game.finishedAt)}</p></div><div className="mx-5 mb-5 space-y-2">{sorted.map(([id, score], index) => <div key={id} className="flex items-center rounded-2xl bg-slate-100 px-4 py-3 text-right dark:bg-white/5"><strong className="w-8">{index + 1}</strong><span className="flex-1 font-bold">{game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name}</span><b className="text-xl tabular-nums">{score}</b></div>)}</div><div className="grid gap-2 p-5 pt-0">{game.gameType === 'tarneeb-61' && <Link className="flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 px-4 font-black text-white shadow-lg shadow-amber-500/20" to={`/summary/${game.id}`}>شوف ملخص القعدة 👑</Link>}<ReplayButton game={game}/><div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={onHistory}>سجل الجولات</Button><Button variant="secondary" icon={<Undo2 size={17}/>} onClick={onUndo}>تراجع</Button></div><Link className="flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 font-bold dark:bg-white/10" to={`/details/${game.id}`}>تفاصيل المباراة</Link><Link className="flex min-h-12 items-center justify-center font-bold text-slate-500" to="/">العودة للرئيسية</Link></div></section></div>;
}

export function ReplayButton({ game }: { game: GameSession }) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  return <Button disabled={saving} icon={<RotateCcw size={18}/>} onClick={async () => { setSaving(true); const now = new Date().toISOString(); const players = game.players.map((player) => ({ ...player })); const idMap = Object.fromEntries(game.players.map((player, index) => [player.id, players[index].id])); const teams = game.teams?.map((team) => ({ ...team, id: uid(), playerIds: [idMap[team.playerIds[0]], idMap[team.playerIds[1]]] as [string, string] })); const fastTeamScored = (game.gameType === 'trix-fast' || game.gameType === 'cc') && game.trixMode === 'partnership'; const ids = fastTeamScored || game.gameType === 'tarneeb-61' ? teams?.map((team) => team.id) ?? [] : players.map((player) => player.id); const next: GameSession = { ...game, id: uid(), players, teams, status: 'active', createdAt: now, updatedAt: now, finishedAt: undefined, currentRound: 0, scores: Object.fromEntries(ids.map((id) => [id, 0])), winnerIds: undefined, firstKingdomOwnerId: game.firstKingdomOwnerId ? idMap[game.firstKingdomOwnerId] : undefined }; await createGame(next); navigate(`/game/${next.id}`); }}>مباراة جديدة بنفس اللاعبين</Button>;
}

function RoundTimeline({ game, rounds, onEdit }: { game: GameSession; rounds: GameRound[]; onEdit: (round: GameRound) => void }) {
  return rounds.length ? <div className="space-y-3">{[...rounds].reverse().map((round) => { const delta = displayRoundDelta(round, game); const details = trixRoundDetails(round, game); return <article key={round.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"><div className="flex items-start justify-between gap-3"><div><span className="eyebrow">الجولة {round.index + 1}</span><h3 className="font-black">{roundTitle(round, game)}</h3></div><button className="grid size-11 place-items-center rounded-xl bg-slate-100 dark:bg-white/10" onClick={() => onEdit(round)} aria-label="تعديل الجولة"><Pencil size={17}/></button></div>{details.length > 0 && <div className="muted mt-2 space-y-1 text-xs">{details.map((detail) => <p key={detail}>{detail}</p>)}</div>}<div className="mt-3 flex flex-wrap gap-2">{Object.entries(delta).map(([id, score]) => <span key={id} className="rounded-xl bg-slate-100 px-3 py-1 text-xs dark:bg-white/5">{labelForId(game, id)} <b className={score < 0 ? 'text-red-500' : 'text-mint-600'}>{scoreText(score)}</b></span>)}</div></article>; })}</div> : <p className="muted py-8 text-center">لم تُسجّل جولات بعد.</p>;
}

function ManualAdjustment({ game, onSave }: { game: GameSession; onSave: (input: ManualAdjustmentInput, delta: Record<string, number>) => Promise<void> }) {
  const teamBased = Boolean(game.teams && (game.rulesSnapshot.kind === 'tarneeb' || game.rulesSnapshot.kind === 'tarneeb-61-v2' || ((game.gameType === 'trix-fast' || game.gameType === 'cc') && game.trixMode === 'partnership')));
  const targets = teamBased ? game.teams! : game.players;
  const [targetId, setTargetId] = useState(targets[0].id);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  return <div className="space-y-4"><p className="muted">يُسجّل التصحيح كحدث مستقل وتُعاد منه حسابات المباراة.</p><div className="grid grid-cols-2 gap-2">{targets.map((target) => <button key={target.id} onClick={() => setTargetId(target.id)} className={`min-h-12 rounded-2xl border font-bold ${targetId === target.id ? 'border-mint-500 bg-mint-500/10' : 'border-slate-200 dark:border-white/10'}`}>{target.name}</button>)}</div><label><span className="label">النقاط (+ أو -)</span><input className="field" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))}/></label><label><span className="label">السبب (اختياري)</span><input className="field" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="مثلاً: قاعدة محلية"/></label><Button className="w-full" disabled={!Number.isInteger(amount) || amount === 0 || saving} onClick={async () => { setSaving(true); await onSave({ targetId, amount, reason }, { [targetId]: amount }); }}>تسجيل التصحيح</Button></div>;
}

function labelForId(game: GameSession, id: string) { return game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? ''; }
function displayRoundDelta(round: GameRound, game: GameSession) {
  if (game.gameType === 'likha' && game.likhaMode === 'partnership' && game.teams) return aggregateLikhaTeamScores(round.scoreDelta, game.teams);
  return game.gameType === 'trix-slow' && game.trixMode === 'partnership' && game.teams ? aggregatePartnershipScores(round.scoreDelta, game.teams) : round.scoreDelta;
}
function trixRoundDetails(round: GameRound, game: GameSession) {
  if (round.type === 'likha') {
    const input = round.input as LikhaRoundInput; const name = (id: string) => labelForId(game, id);
    return [
      `👑 بنت البستوني: ${name(input.specialCards.queenSpades.capturedBy)} · ${input.specialCards.queenSpades.doubled ? '×2 مدبلة' : 'عادي'}`,
      `♦ 10 الديناري: ${name(input.specialCards.tenDiamonds.capturedBy)} · ${input.specialCards.tenDiamonds.doubled ? '×2 مدبل' : 'عادي'}`,
      `♣ ختيار الزهر: ${name(input.specialCards.kingClubs.capturedBy)} · ${input.specialCards.kingClubs.doubled ? '×2 مدبل' : 'عادي'}`,
      `♦ شب الديناري: ${name(input.specialCards.jackDiamonds.capturedBy)} · ${input.specialCards.jackDiamonds.doubled ? '×2 مدبل' : 'عادي'}`,
      `♥ الكوبا: ${input.players.map((entry) => `${name(entry.playerId)} ${entry.heartsCount}`).join(' · ')}`
    ];
  }
  if (!isTrix(game.gameType) || round.type === 'manual-adjustment') return [];
  const input = round.input as TrixRoundInput; const details: string[] = [];
  const targetName = (teamId?: string, playerId?: string) => labelForId(game, teamId ?? playerId ?? '');
  const kingTeam = input.contract === 'king' ? input.selectedTeamId : input.contract === 'complex' ? input.kingTeamId : undefined; const kingPlayer = input.contract === 'king' ? input.selectedPlayerId : input.contract === 'complex' ? input.kingPlayerId : undefined; const kingDoubler = input.contract === 'king' ? input.doubledByPlayerId : input.contract === 'complex' ? input.kingDoubledByPlayerId : undefined;
  if (input.contract === 'king' || input.contract === 'complex') details.push(`شيخ الكبة — أكله: ${targetName(kingTeam, kingPlayer)}${kingDoubler ? ` · مدبل، دبّله: ${labelForId(game, kingDoubler)}` : ' · غير مدبل'}`);
  const queens = input.contract === 'queens' ? input.queens : input.contract === 'complex' ? input.queens : undefined;
  if (Array.isArray(queens)) queens.forEach((queen, index) => { const label = TRIX_QUEENS.find((item) => item.id === (queen.suit ?? queen.id))?.label ?? TRIX_QUEENS[index]?.label; details.push(`${label} — أكلها: ${targetName(queen.takenByTeamId, queen.takenByPlayerId)}${queen.doubled ? ` · مدبلة، دبّلها: ${labelForId(game, queen.doubledByPlayerId ?? '')}` : ' · غير مدبلة'}`); });
  return details;
}
function roundTitle(round: GameRound, game: GameSession) {
  if (round.type === 'likha') return 'جولة ليخة';
  if (round.type === 'tarneeb') return `ضمان ${(round.input as TarneebRoundInput).bid}`;
  if (round.type === 'tarneeb-41') return `ضمانات فردية — ${(round.input as Tarneeb41RoundInput).phaseAtRoundStart === 'normal' ? 'الوضع العادي' : (round.input as Tarneeb41RoundInput).phaseAtRoundStart === 'thirty' ? 'مرحلة 30' : 'مرحلة 41'}`;
  if (round.type === 'manual-adjustment') return `تصحيح نقاط — ${labelForId(game, (round.input as ManualAdjustmentInput).targetId)}`;
  const owner = game.players.find((player) => player.id === round.kingdomOwnerId)?.name;
  return `${CONTRACT_LABELS[round.type as TrixContract]}${owner ? ` — مملكة ${owner}` : ''}`;
}
