import { useLiveQuery } from 'dexie-react-hooks';
import { Crown, Pencil, Sparkles, Undo2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addRound, db, replaceRound, undoLastRound } from '../../db/database';
import { effectiveMessageRules, interpolateTemplate, matchingMessages, pickMessage, readRecentMessageIds, readRecentMessageSkeletons, rememberMessageId, renderMessage, type TemplateValues } from '../../games/fast/messages';
import { ownerForKingdom, partnerForPlayer, partnershipLashScores, teamForPlayer, trixRankingDelta } from '../../games/fast/scoring';
import { shareFastGame } from '../../games/fast/shareCard';
import { buildLashConditionalContext, buildOldManConditionalContext, buildTrixConditionalContext } from '../../games/reactions/contexts';
import { indexConditionalRules, selectConditionalReaction, type ConditionalReactionContext } from '../../games/reactions/conditionalRules';
import type { GameRound, GameSession, LashRoundInput, MessageRule, TrixRankingInput } from '../../types';
import { scoreText, uid } from '../../utils';
import { Button } from '../common/Button';
import { PlayerAvatar } from '../common/PlayerAvatar';
import { ContextMessageOverlay } from './ContextMessageOverlay';
import { LashScoreEntry } from './LashScoreEntry';
import { TrixRankingEntry } from './TrixRankingEntry';

export function FastGamePanel({ game, rounds }: { game: GameSession; rounds: GameRound[] }) {
  const storedRules = useLiveQuery(() => db.messageRules.toArray(), [], []);
  const settings = useLiveQuery(() => db.settings.get('main'));
  const profiles = useLiveQuery(() => db.players.bulkGet(game.players.map((player) => player.profileId).filter((id): id is string => Boolean(id))), [game.id], []);
  const conditionalRules = useLiveQuery(() => db.conditionalRules.toArray(), [], []);
  const conditionalFirings = useLiveQuery(() => db.conditionalRuleFirings.where('gameId').equals(game.id).toArray(), [game.id], []);
  const historicalOldMan = useLiveQuery(async () => {
    const completed = await db.games.where('status').equals('completed').filter((item) => item.id !== game.id && (item.gameType === 'trix-fast' || item.gameType === 'cc')).toArray();
    if (!completed.length) return { hasBaseline: false, maximum: 0 };
    const ids = new Set(completed.map((item) => item.id)); const historicalRounds = (await db.rounds.toArray()).filter((round) => ids.has(round.gameId) && round.type === 'lash'); const counts = new Map<string, number>();
    historicalRounds.forEach((round) => { const key = `${round.gameId}:${(round.input as LashRoundInput).oldMan.eaterPlayerId}`; counts.set(key, (counts.get(key) ?? 0) + 1); });
    return { hasBaseline: true, maximum: Math.max(0, ...counts.values()) };
  }, [game.id], { hasBaseline: false, maximum: 0 });
  const rules = useMemo(() => effectiveMessageRules(storedRules), [storedRules]);
  const conditionalIndex = useMemo(() => indexConditionalRules(conditionalRules), [conditionalRules]);
  const [chosen, setChosen] = useState<'lash' | 'trix-ranking'>();
  const [editing, setEditing] = useState<GameRound>();
  const [messages, setMessages] = useState<Array<{ id: string; text: string; duration: number; source: 'factory' | 'custom'; intensity?: number }>>([]);
  const played = rounds.filter((round) => round.type !== 'manual-adjustment');
  const kingdomIndex = Math.min(3, Math.floor(played.length / 2));
  const owner = ownerForKingdom(game, kingdomIndex);
  const kingdomRounds = played.filter((round) => round.kingdomIndex === kingdomIndex);
  const cc = game.gameType === 'cc';
  const available: Array<'lash' | 'trix-ranking'> = cc ? ['lash'] : kingdomRounds.length === 0 ? ['lash', 'trix-ranking'] : kingdomRounds[0].type === 'lash' ? ['trix-ranking'] : ['lash'];
  const showEvent = useCallback(async (reactionContext: ConditionalReactionContext, candidates: MessageRule[], factoryContext: Parameters<typeof renderMessage>[1]) => {
    if (settings?.contextualMessages === false || settings?.roundReactions === false) return;
    const custom = selectConditionalReaction(conditionalIndex.get(`${reactionContext.game}:${reactionContext.event}`) ?? [], reactionContext, conditionalFirings);
    if (custom) {
      await db.conditionalRuleFirings.add({ id: uid(), ruleId: custom.rule.id, gameId: game.id, event: reactionContext.event, alternativeId: custom.alternative.id, roundIndex: reactionContext.roundIndex, firedAt: new Date().toISOString() });
      setMessages((current) => [...current, { id: custom.alternative.id, text: interpolateTemplate(custom.alternative.text, reactionContext.placeholders as TemplateValues), duration: custom.rule.durationMs, source: 'custom', intensity: custom.rule.intensity }]);
      return;
    }
    const selected = pickMessage(candidates, readRecentMessageIds(), Math.random, readRecentMessageSkeletons());
    if (!selected) return;
    rememberMessageId(selected.id, selected.template);
    setMessages((current) => [...current, { id: selected.id, text: renderMessage(selected, factoryContext), duration: selected.durationMs, source: 'factory', intensity: selected.intensity }]);
  }, [conditionalFirings, conditionalIndex, game.id, settings?.contextualMessages, settings?.roundReactions]);
  const saveLash = async (input: LashRoundInput, delta: Record<string, number>) => {
    await addRound({ gameId: game.id, type: 'lash', kingdomIndex, kingdomOwnerId: owner.id, input, scoreDelta: delta });
    const ownerTeam = teamForPlayer(owner.id, game.teams);
    const ownerScore = input.kind === 'lash-partnership' || input.kind === 'lash-partnership-fixed-total' ? partnershipLashScores(input, game.teams ?? [])[ownerTeam?.id ?? ''] : input.scoresByPlayer[owner.id];
    const eaterTeam = teamForPlayer(input.oldMan.eaterPlayerId, game.teams);
    const oldManEvent: MessageRule['event'] = input.oldMan.eaterPlayerId === owner.id ? 'old-man-owner' : ownerTeam && eaterTeam?.id === ownerTeam.id ? 'old-man-partner' : 'old-man-opponent';
    const occurrences = played.filter((round) => round.type === 'lash' && (round.input as LashRoundInput).oldMan.eaterPlayerId === input.oldMan.eaterPlayerId).length + 1;
    const historicalRecord = historicalOldMan.hasBaseline && occurrences >= Math.max(2, historicalOldMan.maximum);
    const context = { game, owner, ownerScore, eaterPlayerId: input.oldMan.eaterPlayerId, doubled: input.oldMan.doubled, occurrences, intensity: settings?.roastIntensity ?? 4, historicalRecord };
    await showEvent(buildLashConditionalContext(game, rounds, input, owner, kingdomIndex, settings?.roastIntensity ?? 4), matchingMessages(rules, context, 'lash-owner-score'), context);
    await showEvent(buildOldManConditionalContext(game, rounds, input, owner, kingdomIndex, settings?.roastIntensity ?? 4, historicalRecord), matchingMessages(rules, context, oldManEvent), context);
    setChosen(undefined);
  };
  const saveTrix = async (input: TrixRankingInput, delta: Record<string, number>) => {
    await addRound({ gameId: game.id, type: 'trix-ranking', kingdomIndex, kingdomOwnerId: owner.id, input, scoreDelta: delta });
    const individual = trixRankingDelta(input.finishingOrder, game.players);
    const partnerId = partnerForPlayer(owner.id, game.teams);
    const context = { game, owner, ownerScore: individual[owner.id], partnerScore: partnerId ? individual[partnerId] : undefined, intensity: settings?.roastIntensity ?? 4 };
    await showEvent(buildTrixConditionalContext(game, rounds, input, owner, kingdomIndex, settings?.roastIntensity ?? 4), game.trixMode === 'partnership' ? matchingMessages(rules, context, 'trix-partnership') : [], context);
    setChosen(undefined);
  };
  if (game.status === 'completed') return <FastResult game={game} rounds={rounds}/>;
  const currentLabel = chosen === 'lash' ? cc ? `لطش ${kingdomRounds.length + 1}` : 'لطش / كومبلكس' : chosen === 'trix-ranking' ? 'تركس' : undefined;

  return <div className="px-4 py-4">
    <section className="sticky top-[69px] z-10 rounded-3xl border border-[var(--border)] bg-[color:var(--surface)]/95 p-3 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between"><div><span className="eyebrow">المملكة {kingdomIndex + 1} من 4</span><h2 className="font-black"><Crown className="ms-1 inline text-amber-500" size={17}/>{owner.name}</h2></div><div className="text-left"><span className="muted block text-[10px]">{currentLabel ?? 'اختر الجولة'}</span><strong>{played.length} / 8</strong></div></div>
      {game.trixMode === 'partnership' && game.teams ? <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">{game.teams.map((team, index) => <div data-testid={`team-score-${index + 1}`} key={team.id} className={`rounded-2xl p-2 ${team.playerIds.includes(owner.id) ? 'bg-mint-500/15 ring-1 ring-mint-500' : 'bg-slate-100 dark:bg-white/5'}`}><div className="flex items-center justify-center -space-x-2 space-x-reverse">{team.playerIds.map((id) => { const player = game.players.find((item) => item.id === id)!; const profile = profiles.find((item) => item?.id === player.profileId); return <PlayerAvatar key={id} name={player.name} photo={profile?.photo} size="sm"/>; })}</div><span className="mt-1 block truncate text-center text-[10px] font-bold">{team.playerIds.map((id) => game.players.find((player) => player.id === id)?.name).join(' + ')}</span><b className={`score-pop block text-center text-2xl ${game.scores[team.id] < 0 ? 'text-red-500' : 'text-mint-600'}`}>{scoreText(game.scores[team.id] ?? 0)}</b></div>).flatMap((node, index) => index === 0 ? [node, <b key="vs" className="self-center text-xs text-slate-400">VS</b>] : [node])}</div> : <div className="mt-2 grid grid-cols-4 gap-1">{game.players.map((player) => <div key={player.id} className={`rounded-xl p-2 text-center ${player.id === owner.id ? 'bg-mint-500/15 ring-1 ring-mint-500' : 'bg-slate-100 dark:bg-white/5'}`}><span className="block truncate text-[10px] font-bold">{player.name}</span><b className={`score-pop block text-lg ${game.scores[player.id] < 0 ? 'text-red-500' : 'text-mint-600'}`}>{scoreText(game.scores[player.id] ?? 0)}</b></div>)}</div>}
    </section>
    {!chosen && !editing && <section className="mt-4"><h3 className="mb-3 text-lg font-black">{kingdomRounds.length ? 'الجولة التالية إلزامية' : 'شو بدكم تلعبوا أول؟'}</h3><div className="grid gap-3">{available.map((type) => <button key={`${type}-${kingdomRounds.length}`} onClick={() => setChosen(type)} className="contract-switch min-h-24 rounded-3xl border border-mint-500/40 bg-gradient-to-l from-mint-500/15 to-sky-500/10 p-5 text-right"><Sparkles className="mb-2 text-mint-600"/><strong className="text-xl">{type === 'lash' ? cc ? `لطش ${kingdomRounds.length + 1}` : 'لطش / كومبلكس' : 'تركس'}</strong></button>)}</div></section>}
    {chosen && <section className="surface mt-4 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xl font-black">{currentLabel}</h3><Button size="sm" variant="ghost" onClick={() => setChosen(undefined)}>إلغاء</Button></div>{chosen === 'lash' ? <LashScoreEntry game={game} onConfirm={saveLash}/> : <TrixRankingEntry players={game.players} onConfirm={saveTrix}/>}</section>}
    {editing && <section className="surface mt-4 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-black">تعديل الجولة {editing.index + 1}</h3><Button size="sm" variant="ghost" onClick={() => setEditing(undefined)}>إلغاء</Button></div>{editing.type === 'lash' ? <LashScoreEntry game={game} initial={editing.input as LashRoundInput} onConfirm={async (input, delta) => { await replaceRound(editing.id, { input, scoreDelta: delta, type: 'lash', note: editing.note }); setEditing(undefined); }}/> : <TrixRankingEntry players={game.players} initial={editing.input as TrixRankingInput} onConfirm={async (input, delta) => { await replaceRound(editing.id, { input, scoreDelta: delta, type: 'trix-ranking', note: editing.note }); setEditing(undefined); }}/>}</section>}
    {played.length > 0 && !editing && <section className="mt-4"><span className="eyebrow">الجولات المسجلة</span><div className="mt-2 space-y-2">{[...played].reverse().map((round) => <button key={round.id} onClick={() => { setChosen(undefined); setEditing(round); }} className="flex min-h-12 w-full items-center justify-between rounded-2xl bg-[var(--surface)] px-4 text-sm font-bold"><span>المملكة {(round.kingdomIndex ?? 0) + 1} · {round.type === 'lash' ? 'لطش' : 'تركس'}</span><Pencil size={16}/></button>)}</div></section>}
    {messages[0] && <ContextMessageOverlay message={messages[0].text} durationMs={messages[0].duration} messageId={messages[0].id} source={messages[0].source} intensity={messages[0].intensity} onDismiss={() => setMessages((current) => current.slice(1))}/>}
  </div>;
}

function FastResult({ game, rounds }: { game: GameSession; rounds: GameRound[] }) {
  const displayed = game.scores;
  const name = (id: string) => game.teams?.find((team) => team.id === id)?.name ?? game.players.find((player) => player.id === id)?.name ?? id;
  const entries = Object.entries(displayed).sort((a, b) => b[1] - a[1]);
  const best = Math.max(...entries.map(([, score]) => score));
  return <section className="m-4 surface match-finish p-6 text-center"><Crown className="mx-auto text-amber-500" size={48}/><span className="eyebrow">انتهت المباراة</span><h2 className="text-3xl font-black">{entries.filter(([, score]) => score === best).map(([id]) => name(id)).join(' و ')}</h2><div className="mt-5 space-y-2">{entries.map(([id, score]) => <div key={id} className="flex justify-between rounded-2xl bg-slate-100 p-3 dark:bg-white/5"><b>{name(id)}</b><strong>{score}</strong></div>)}</div><div className="mt-4 grid gap-2"><Link className="flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-l from-amber-500 to-amber-600 px-4 font-black text-white" to={`/fast-summary/${game.id}`}>ملخص القعدة والألقاب</Link><Button className="w-full" onClick={() => shareFastGame(game)}>مشاركة بطاقة النتيجة</Button><Button variant="secondary" icon={<Undo2/>} onClick={() => undoLastRound(game.id)}>تراجع عن آخر جولة</Button><small className="muted">{rounds.length} جولات محفوظة</small></div></section>;
}
