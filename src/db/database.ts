import Dexie, { type EntityTable } from 'dexie';
import { aggregatePartnershipScores, calculateTrixRound, validateKingdomBalance, validatePartnershipKingdomBalance, validateTrixInput } from '../games/trix/scoring';
import { DEFAULT_TRIX_RULES, FAST_CONTRACTS, SLOW_CONTRACTS } from '../games/trix/rules';
import { createUnconfirmedTarneebRules } from '../games/tarneeb/rules';
import { calculateTarneeb41Round, calculateTarneeb61Round, deriveTarneeb41PlayerPhases, determineTarneeb41Winner, determineTarneebWinner } from '../games/tarneeb/scoring';
import type { AppSettings, BackupFile, ConditionalReactionRule, ConditionalRuleFiring, ContentOverride, GameRound, GameSession, LikhaRoundInput, PlayerProfile, RulePreset, Tarneeb41RoundInput, TarneebRoundInput, TelegramOutboxItem, TrixRoundInput } from '../types';
import { isTrix, uid } from '../utils';
import { deriveFastRoundDelta, isFastGame, validateFastKingdom, validateLashInput } from '../games/fast/scoring';
import type { LashRoundInput, MessageRule, TrixRankingInput } from '../types';
import type { AudioEventMapping, UploadedAudioAsset } from '../audio/types';
import { aggregateLikhaTeamScores, calculateLikhaRound, isLikhaGameFinished, rankLikhaPlayers } from '../games/likha/engine';
import { currentWinnerIds } from '../results/standings';
import { buildTelegramGameResult } from '../telegram/resultComposer';

class KokDatabase extends Dexie {
  games!: EntityTable<GameSession, 'id'>;
  rounds!: EntityTable<GameRound, 'id'>;
  players!: EntityTable<PlayerProfile, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  presets!: EntityTable<RulePreset, 'id'>;
  messageRules!: EntityTable<MessageRule, 'id'>;
  contentOverrides!: EntityTable<ContentOverride, 'id'>;
  conditionalRules!: EntityTable<ConditionalReactionRule, 'id'>;
  conditionalRuleFirings!: EntityTable<ConditionalRuleFiring, 'id'>;
  audioAssets!: EntityTable<UploadedAudioAsset, 'id'>;
  audioEventMappings!: EntityTable<AudioEventMapping, 'event'>;
  telegramOutbox!: EntityTable<TelegramOutboxItem, 'id'>;

  constructor() {
    // الاسم الداخلي القديم محفوظ عمداً كي لا تضيع بيانات مستخدمي V1.
    super('lammatna-db');
    this.version(1).stores({
      games: 'id, gameType, status, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, lastPlayedAt', settings: 'id', presets: 'id, gameType'
    });
    this.version(2).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, lastPlayedAt', settings: 'id', presets: 'id, gameType'
    }).upgrade((transaction) => transaction.table('games').toCollection().modify((game: GameSession) => {
      if (!game.rulesVersion) game.rulesVersion = 1;
    }));
    this.version(3).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, updatedAt, lastPlayedAt', settings: 'id', presets: 'id, gameType', messageRules: 'id, factoryId, category, event'
    }).upgrade((transaction) => transaction.table('players').toCollection().modify((player: PlayerProfile) => {
      const fallback = player.lastPlayedAt ?? new Date().toISOString();
      if (!player.createdAt) player.createdAt = fallback;
      if (!player.updatedAt) player.updatedAt = fallback;
      delete player.gamesPlayed;
    }));
    this.version(4).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, updatedAt, lastPlayedAt', settings: 'id', presets: 'id, gameType', messageRules: 'id, factoryId, category, event',
      contentOverrides: 'id, factoryId, category, updatedAt'
    }).upgrade(async (transaction) => {
      const table = transaction.table<MessageRule>('messageRules');
      const stored = await table.toArray();
      for (const rule of stored) {
        let nextId: string | undefined;
        if (/^(fast-lash|cc-lash)-.+/.test(rule.id) && !/-\d+$/.test(rule.id)) nextId = `${rule.id}-1`;
        else if (/^fast-trix-\d+-\d+$/.test(rule.id)) nextId = `${rule.id}-1`;
        else if (rule.id === 'old-man-owner-normal') nextId = 'old-man-owner-normal-1';
        else if (rule.id === 'old-man-owner-doubled') nextId = 'old-man-owner-doubled-1';
        else if (/^tarneeb-break-private-\d+$/.test(rule.id)) {
          nextId = `failure-private-${Number(rule.id.split('-').at(-1)) + 1}`;
          rule.category = 'tarneeb-failure'; rule.event = 'tarneeb-failure';
        }
        if (nextId && nextId !== rule.id) { await table.delete(rule.id); await table.put({ ...rule, id: nextId, factoryId: nextId }); }
      }
    });
    this.version(5).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, updatedAt, lastPlayedAt', settings: 'id', presets: 'id, gameType', messageRules: 'id, factoryId, category, event',
      contentOverrides: 'id, factoryId, category, updatedAt', conditionalRules: 'id, game, event, enabled, exclusive, priority, updatedAt',
      conditionalRuleFirings: 'id, ruleId, gameId, [gameId+ruleId], event, firedAt'
    });
    this.version(6).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, updatedAt, lastPlayedAt', settings: 'id', presets: 'id, gameType', messageRules: 'id, factoryId, category, event',
      contentOverrides: 'id, factoryId, category, updatedAt', conditionalRules: 'id, game, event, enabled, exclusive, priority, updatedAt',
      conditionalRuleFirings: 'id, ruleId, gameId, [gameId+ruleId], event, firedAt', audioAssets: 'id, name, createdAt, updatedAt', audioEventMappings: 'event, assetId, updatedAt'
    });
    // V7 keeps the same stores and indexes: Likha is represented by the existing
    // game/round records, so upgrading never copies or rewrites historic data.
    this.version(7).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, updatedAt, lastPlayedAt', settings: 'id', presets: 'id, gameType', messageRules: 'id, factoryId, category, event',
      contentOverrides: 'id, factoryId, category, updatedAt', conditionalRules: 'id, game, event, enabled, exclusive, priority, updatedAt',
      conditionalRuleFirings: 'id, ruleId, gameId, [gameId+ruleId], event, firedAt', audioAssets: 'id, name, createdAt, updatedAt', audioEventMappings: 'event, assetId, updatedAt'
    });
    // V8 adds only the optional Likha mode field to game records. No indexes or
    // historic records are rewritten; absent mode intentionally means individual.
    this.version(8).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, updatedAt, lastPlayedAt', settings: 'id', presets: 'id, gameType', messageRules: 'id, factoryId, category, event',
      contentOverrides: 'id, factoryId, category, updatedAt', conditionalRules: 'id, game, event, enabled, exclusive, priority, updatedAt',
      conditionalRuleFirings: 'id, ruleId, gameId, [gameId+ruleId], event, firedAt', audioAssets: 'id, name, createdAt, updatedAt', audioEventMappings: 'event, assetId, updatedAt'
    });
    // V9 adds a durable outbox only. No historic game or round is rewritten.
    this.version(9).stores({
      games: 'id, gameType, status, rulesVersion, createdAt, updatedAt', rounds: 'id, gameId, [gameId+index], createdAt',
      players: 'id, &name, updatedAt, lastPlayedAt', settings: 'id', presets: 'id, gameType', messageRules: 'id, factoryId, category, event',
      contentOverrides: 'id, factoryId, category, updatedAt', conditionalRules: 'id, game, event, enabled, exclusive, priority, updatedAt',
      conditionalRuleFirings: 'id, ruleId, gameId, [gameId+ruleId], event, firedAt', audioAssets: 'id, name, createdAt, updatedAt', audioEventMappings: 'event, assetId, updatedAt',
      telegramOutbox: 'id, &[gameId+resultRevision], status, nextAttemptAt, createdAt, sentAt'
    });
  }
}

export const db = new KokDatabase();
export const DEFAULT_SETTINGS: AppSettings = { id: 'main', theme: 'system', vibration: true, keepAwake: false, roundReactions: true, contextualMessages: true, preferredTarneebTarget: 61, roastIntensity: 4, soundEnabled: true, masterVolume: 80, effectsEnabled: true, effectsVolume: 75, messageVoiceEnabled: false, voiceVolume: 90, uiSoundsEnabled: false, speechRate: 1, speechPitch: 1, telegramAutoSend: false, onboardingSeen: false };

const initialPresets = (): RulePreset[] => {
  const now = new Date().toISOString();
  return [
    { id: 'trix-slow', gameType: 'trix-slow', name: 'قواعد التركس البطيئة', rules: structuredClone(DEFAULT_TRIX_RULES), updatedAt: now },
    { id: 'trix-fast', gameType: 'trix-fast', name: 'قواعد التركس السريعة', rules: structuredClone(DEFAULT_TRIX_RULES), updatedAt: now },
    { id: 'tarneeb-61', gameType: 'tarneeb-61', name: 'قواعد V1 — طرنيب 61', rules: createUnconfirmedTarneebRules(61), updatedAt: now },
    { id: 'tarneeb-41', gameType: 'tarneeb-41', name: 'قواعد V1 — طرنيب 41', rules: createUnconfirmedTarneebRules(41), updatedAt: now }
  ];
};

export async function initializeDatabase() {
  await db.transaction('rw', db.settings, db.presets, db.messageRules, async () => {
    const settings = await db.settings.get('main');
    if (!settings) await db.settings.add(DEFAULT_SETTINGS);
    else if (settings.roundReactions === undefined) await db.settings.update('main', { roundReactions: true });
    if (settings && settings.preferredTarneebTarget === undefined) await db.settings.update('main', { preferredTarneebTarget: 61, contextualMessages: true });
    if (settings && settings.roastIntensity === undefined) await db.settings.update('main', { roastIntensity: 4 });
    if (settings && settings.soundEnabled === undefined) await db.settings.update('main', { soundEnabled: true, masterVolume: 80, effectsEnabled: true, effectsVolume: 75, messageVoiceEnabled: false, voiceVolume: 90, uiSoundsEnabled: false, speechRate: 1, speechPitch: 1 });
    if (settings && settings.telegramAutoSend === undefined) await db.settings.update('main', { telegramAutoSend: false });
    for (const preset of initialPresets()) if (!(await db.presets.get(preset.id))) await db.presets.add(preset);
    for (const id of ['trix-slow', 'trix-fast'] as const) {
      const preset = await db.presets.get(id);
      if (preset && 'kingPenalty' in preset.rules && preset.rules.version !== 2) {
        await db.presets.update(id, { rules: { ...preset.rules, version: 2, doublingEnabled: true }, updatedAt: new Date().toISOString() });
      }
    }
  });
  const legacyFastPartnerships = await db.games.filter((game) => game.trixMode === 'partnership' && (game.rulesSnapshot.kind === 'fast-trix-v3' || game.rulesSnapshot.kind === 'cc-v1')).toArray();
  for (const game of legacyFastPartnerships) await recomputeGame(game.id);
}

export async function createGame(session: GameSession) {
  await db.transaction('rw', db.games, db.players, db.settings, async () => {
    await db.games.add(session);
    for (const player of session.players.filter((item) => item.profileId)) {
      const existing = await db.players.get(player.profileId!);
      if (existing) await db.players.update(existing.id, { lastPlayedAt: session.createdAt, updatedAt: existing.updatedAt });
    }
    await db.settings.update('main', { lastActiveGameId: session.id });
  });
}

export async function enqueueTelegramResult(gameId: string, correction = false) {
  const [game, settings, rounds] = await Promise.all([db.games.get(gameId), db.settings.get('main'), db.rounds.where('gameId').equals(gameId).sortBy('index')]);
  if (!game || game.status !== 'completed' || !settings?.telegramAutoSend || !settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) return undefined;
  const result = buildTelegramGameResult(game, rounds, correction); const now = new Date().toISOString(); const id = `${game.id}:${result.snapshot.resultRevision}`;
  const existing = await db.telegramOutbox.get(id);
  const item: TelegramOutboxItem = existing ? { ...existing, messageText: result.plainText, resultSnapshot: result.snapshot, updatedAt: now, status: existing.status === 'sent' ? 'sent' : 'pending', nextAttemptAt: undefined, lastError: existing.status === 'sent' ? existing.lastError : undefined } : { id, gameId: game.id, gameType: game.gameType, resultRevision: result.snapshot.resultRevision, messageText: result.plainText, resultSnapshot: result.snapshot, createdAt: now, updatedAt: now, status: 'pending', attemptCount: 0 };
  await db.telegramOutbox.put(item);
  if (typeof window !== 'undefined') queueMicrotask(() => { void import('../telegram/lifecycle').then(({ registerTelegramBackgroundSync }) => registerTelegramBackgroundSync()); void import('../telegram/outbox').then(({ flushTelegramOutbox }) => flushTelegramOutbox()); });
  return item;
}

/** Finalizes exactly the last persisted score. The active-status guard makes rapid double confirmation idempotent. */
export async function finalizeGameEarly(gameId: string) {
  const result = await db.transaction('rw', db.games, db.settings, async () => {
    const game = await db.games.get(gameId); if (!game) throw new Error('المباراة غير موجودة');
    if (game.status !== 'active') return { game, finalized: false };
    const now = new Date().toISOString(); const winnerIds = currentWinnerIds(game); const resultRevision = Math.max(1, game.resultRevision ?? 1);
    await db.games.update(gameId, { status: 'completed', finishReason: 'manual_early_finish', finishedAt: now, updatedAt: now, winnerIds, resultRevision });
    const settings = await db.settings.get('main'); if (settings?.lastActiveGameId === gameId) await db.settings.update('main', { lastActiveGameId: undefined });
    return { game: (await db.games.get(gameId))!, finalized: true };
  });
  const queued = result.finalized ? await enqueueTelegramResult(gameId) : undefined;
  return { ...result, queued };
}

const sumScores = (base: Record<string, number>, delta: Record<string, number>, allowNegative = true) =>
  Object.fromEntries(Object.keys(base).map((id) => [id, allowNegative ? base[id] + (delta[id] ?? 0) : Math.max(0, base[id] + (delta[id] ?? 0))]));

const scoreIdsForGame = (game: GameSession) => game.gameType === 'likha'
  ? game.players.map((player) => player.id)
  : isFastGame(game) && game.trixMode === 'partnership' && game.teams
  ? game.teams.map((team) => team.id)
  : game.rulesSnapshot.kind === 'tarneeb-41-v2' || isTrix(game.gameType) || game.gameType === 'cc'
    ? game.players.map((player) => player.id)
    : game.teams?.map((team) => team.id) ?? game.players.map((player) => player.id);

function validateCompletedTrixKingdoms(game: GameSession, rounds: GameRound[]) {
  if (!isTrix(game.gameType) || isFastGame(game)) return;
  const contracts = game.gameType === 'trix-slow' ? SLOW_CONTRACTS : FAST_CONTRACTS;
  for (let kingdom = 0; kingdom < 4; kingdom += 1) {
    const kingdomRounds = rounds.filter((round) => round.kingdomIndex === kingdom && round.type !== 'manual-adjustment');
    const balanced = game.trixMode === 'partnership' && game.teams ? validatePartnershipKingdomBalance(kingdomRounds.map((round) => round.scoreDelta), game.teams) : validateKingdomBalance(kingdomRounds.map((round) => round.scoreDelta));
    if (kingdomRounds.length === contracts.length && !balanced) {
      throw new Error(`اختل توازن المملكة ${kingdom + 1}: يجب أن يكون المجموع صفراً`);
    }
  }
}

function completionState(game: GameSession, rounds: GameRound[], scores: Record<string, number>) {
  if (game.rulesSnapshot.kind === 'likha-v1') {
    const officialScores = game.likhaMode === 'partnership' && game.teams ? aggregateLikhaTeamScores(scores, game.teams) : scores;
    if (!isLikhaGameFinished(officialScores, game.rulesSnapshot.rules.lossLimit)) return { status: 'active' as const, winnerIds: undefined };
    return { status: 'completed' as const, winnerIds: rankLikhaPlayers(officialScores).filter((entry) => entry.winner).map((entry) => entry.playerId) };
  }
  if (isFastGame(game)) {
    const played = rounds.filter((round) => round.type !== 'manual-adjustment');
    if (played.length < 8) return { status: 'active' as const, winnerIds: undefined };
    for (let kingdom = 0; kingdom < 4; kingdom += 1) if (!validateFastKingdom(played, kingdom, game.gameType as 'trix-fast' | 'cc')) throw new Error('نتيجة المملكة غير متوازنة');
    const ranked = scores;
    const best = Math.max(...Object.values(ranked));
    return { status: 'completed' as const, winnerIds: Object.keys(ranked).filter((id) => ranked[id] === best) };
  }
  if (isTrix(game.gameType)) {
    const total = game.gameType === 'trix-slow' ? 20 : 8;
    if (rounds.filter((round) => round.type !== 'manual-adjustment').length < total) return { status: 'active' as const, winnerIds: undefined };
    const rankedScores = game.trixMode === 'partnership' && game.teams ? aggregatePartnershipScores(scores, game.teams) : scores;
    const best = Math.max(...Object.values(rankedScores));
    return { status: 'completed' as const, winnerIds: Object.keys(rankedScores).filter((id) => rankedScores[id] === best) };
  }
  if (game.rulesSnapshot.kind === 'tarneeb-61-v2') {
    const targetScore = game.rulesSnapshot.rules.targetScore;
    const reached = Object.entries(scores).filter(([, score]) => score >= targetScore);
    if (!reached.length) return { status: 'active' as const, winnerIds: undefined };
    const best = Math.max(...reached.map(([, score]) => score));
    const winners = reached.filter(([, score]) => score === best).map(([id]) => id);
    return winners.length === 1 ? { status: 'completed' as const, winnerIds: winners } : { status: 'active' as const, winnerIds: winners };
  }
  if (game.rulesSnapshot.kind === 'tarneeb-41-v2' && game.teams) {
    const winners = determineTarneeb41Winner(scores, game.teams);
    return winners.length === 1 ? { status: 'completed' as const, winnerIds: winners } : { status: 'active' as const, winnerIds: winners.length ? winners : undefined };
  }
  if (game.rulesSnapshot.kind !== 'tarneeb') return { status: 'active' as const, winnerIds: undefined };
  const winners = determineTarneebWinner(scores, game.rulesSnapshot.rules);
  return winners.length === 1 ? { status: 'completed' as const, winnerIds: winners } : { status: 'active' as const, winnerIds: winners.length ? winners : undefined };
}

async function recomputeGameInTransaction(gameId: string) {
  const game = await db.games.get(gameId);
  if (!game) throw new Error('المباراة غير موجودة');
  const rounds = await db.rounds.where('gameId').equals(gameId).sortBy('index');
  let scores = Object.fromEntries(scoreIdsForGame(game).map((id) => [id, 0]));
  const allowNegative = game.rulesSnapshot.kind === 'tarneeb' ? game.rulesSnapshot.rules.allowNegativeScore : true;
  const normalizedRounds: GameRound[] = [];
  for (const round of rounds) {
    let input = round.input;
    let scoreDelta = round.scoreDelta;
    if (isFastGame(game) && (round.type === 'lash' || round.type === 'trix-ranking')) {
      scoreDelta = deriveFastRoundDelta(round.input as LashRoundInput | TrixRankingInput, game);
    } else if (game.rulesSnapshot.kind === 'tarneeb-41-v2' && round.type === 'tarneeb-41' && game.teams) {
      const entries = (round.input as Tarneeb41RoundInput).entries.map(({ playerId, bid, actualTricks }) => ({ playerId, bid, actualTricks }));
      const calculated = calculateTarneeb41Round(entries, deriveTarneeb41PlayerPhases(scores, game.teams), game.players, game.rulesSnapshot.rules);
      input = calculated.input;
      scoreDelta = calculated.delta;
    } else if (game.rulesSnapshot.kind === 'likha-v1' && round.type === 'likha') {
      scoreDelta = calculateLikhaRound(round.input as LikhaRoundInput, game.players.map((player) => player.id));
    } else if (game.rulesSnapshot.kind === 'tarneeb-61-v2' && round.type === 'tarneeb' && game.teams) {
      scoreDelta = calculateTarneeb61Round(round.input as TarneebRoundInput, [game.teams[0].id, game.teams[1].id], game.rulesSnapshot.rules).delta;
    } else if (game.rulesSnapshot.kind === 'trix' && round.type !== 'manual-adjustment') {
      const trixInput = round.input as TrixRoundInput;
      if (!validateTrixInput(trixInput, game.rulesSnapshot.rules)) throw new Error('جولة تركس قديمة أو معدّلة غير مكتملة');
      scoreDelta = calculateTrixRound(trixInput, game.players, game.rulesSnapshot.rules, game.teams);
    }
    scores = sumScores(scores, scoreDelta, allowNegative);
    const normalized = { ...round, input, scoreDelta, scoreAfter: structuredClone(scores) };
    normalizedRounds.push(normalized);
    await db.rounds.update(round.id, { input, scoreDelta, scoreAfter: normalized.scoreAfter });
  }
  validateCompletedTrixKingdoms(game, normalizedRounds);
  const completion = completionState(game, normalizedRounds, scores);
  const now = new Date().toISOString();
  await db.games.update(gameId, {
    scores, currentRound: rounds.length, updatedAt: now, status: completion.status, winnerIds: completion.winnerIds,
    finishedAt: completion.status === 'completed' ? game.finishedAt ?? now : undefined,
    finishReason: completion.status === 'completed' ? game.finishReason ?? 'natural' : undefined,
    resultRevision: completion.status === 'completed' ? game.resultRevision ?? 1 : game.resultRevision
  });
  if (completion.status === 'completed') {
    const settings = await db.settings.get('main');
    if (settings?.lastActiveGameId === gameId) await db.settings.update('main', { lastActiveGameId: undefined });
  } else await db.settings.update('main', { lastActiveGameId: gameId });
  return db.games.get(gameId);
}

export async function recomputeGame(gameId: string) {
  const game = await db.transaction('rw', db.games, db.rounds, db.settings, () => recomputeGameInTransaction(gameId));
  if (game?.status === 'completed') await enqueueTelegramResult(gameId);
  return game;
}

function normalizeNewRound(game: GameSession, round: Omit<GameRound, 'id' | 'index' | 'scoreAfter' | 'createdAt'>) {
  if (isFastGame(game) && round.type === 'lash') {
    const input = round.input as LashRoundInput;
    if (!validateLashInput(input, game)) throw new Error('يجب أن يكون مجموع اللطش -500 وبنفس نوع المباراة');
    return { ...round, scoreDelta: deriveFastRoundDelta(input, game) };
  }
  if (isFastGame(game) && round.type === 'trix-ranking') {
    return { ...round, scoreDelta: deriveFastRoundDelta(round.input as TrixRankingInput, game) };
  }
  if (game.rulesSnapshot.kind === 'tarneeb-61-v2' && round.type === 'tarneeb' && game.teams) {
    return { ...round, scoreDelta: calculateTarneeb61Round(round.input as TarneebRoundInput, [game.teams[0].id, game.teams[1].id], game.rulesSnapshot.rules).delta };
  }
  if (game.rulesSnapshot.kind === 'tarneeb-41-v2' && round.type === 'tarneeb-41' && game.teams) {
    const entries = (round.input as Tarneeb41RoundInput).entries.map(({ playerId, bid, actualTricks }) => ({ playerId, bid, actualTricks }));
    const calculated = calculateTarneeb41Round(entries, deriveTarneeb41PlayerPhases(game.scores, game.teams), game.players, game.rulesSnapshot.rules);
    return { ...round, input: calculated.input, scoreDelta: calculated.delta };
  }
  if (game.rulesSnapshot.kind === 'likha-v1' && round.type === 'likha') {
    return { ...round, scoreDelta: calculateLikhaRound(round.input as LikhaRoundInput, game.players.map((player) => player.id)) };
  }
  if (game.rulesSnapshot.kind === 'trix' && round.type !== 'manual-adjustment') {
    const input = round.input as TrixRoundInput;
    if (!validateTrixInput(input, game.rulesSnapshot.rules)) throw new Error('جولة تركس غير مكتملة');
    return { ...round, scoreDelta: calculateTrixRound(input, game.players, game.rulesSnapshot.rules, game.teams) };
  }
  return round;
}

export async function addRound(round: Omit<GameRound, 'id' | 'index' | 'scoreAfter' | 'createdAt'>) {
  const saved = await db.transaction('rw', db.games, db.rounds, db.settings, async () => {
    const game = await db.games.get(round.gameId);
    if (!game || game.status !== 'active') throw new Error('لا يمكن إضافة جولة لهذه المباراة');
    const normalized = normalizeNewRound(game, round);
    const existingRounds = await db.rounds.where('gameId').equals(round.gameId).sortBy('index');
    if (isFastGame(game) && round.type !== 'manual-adjustment') {
      const sameKingdom = existingRounds.filter((item) => item.kingdomIndex === round.kingdomIndex && item.type !== 'manual-adjustment');
      if (sameKingdom.length >= 2 || game.gameType === 'trix-fast' && sameKingdom.some((item) => item.type === round.type)) throw new Error('هذه الجولة مسجلة مسبقًا');
    }
    const last = existingRounds.at(-1);
    const allowNegative = game.rulesSnapshot.kind === 'tarneeb' ? game.rulesSnapshot.rules.allowNegativeScore : true;
    const scoreAfter = sumScores(game.scores, normalized.scoreDelta, allowNegative);
    const saved: GameRound = { ...normalized, id: uid(), index: (last?.index ?? -1) + 1, scoreAfter, createdAt: new Date().toISOString() };
    validateCompletedTrixKingdoms(game, [...existingRounds, saved]);
    await db.rounds.add(saved);
    await db.games.update(game.id, { scores: scoreAfter, updatedAt: saved.createdAt, currentRound: saved.index + 1 });
    await db.settings.update('main', { lastActiveGameId: game.id });
    await recomputeGameInTransaction(game.id);
    return saved;
  });
  const completed = await db.games.get(round.gameId); if (completed?.status === 'completed') await enqueueTelegramResult(round.gameId);
  return saved;
}

export async function replaceRound(roundId: string, updates: Pick<GameRound, 'input' | 'scoreDelta' | 'type' | 'note'>) {
  const previousRound = await db.rounds.get(roundId); const previousGame = previousRound ? await db.games.get(previousRound.gameId) : undefined;
  const updated = await db.transaction('rw', db.games, db.rounds, db.settings, async () => {
    const round = await db.rounds.get(roundId);
    if (!round) throw new Error('الجولة غير موجودة');
    await db.rounds.update(roundId, updates);
    return recomputeGameInTransaction(round.gameId);
  });
  if (updated?.status === 'completed') {
    const latest = await db.telegramOutbox.where('gameId').equals(updated.id).reverse().sortBy('resultRevision').then((items) => items.at(-1));
    if (previousGame?.status === 'completed' && latest?.status === 'sent') { await db.games.update(updated.id, { resultRevision: (updated.resultRevision ?? 1) + 1 }); await enqueueTelegramResult(updated.id, true); }
    else await enqueueTelegramResult(updated.id);
  }
  return updated;
}

export async function undoLastRound(gameId: string) {
  await db.transaction('rw', db.games, db.rounds, db.settings, db.conditionalRuleFirings, async () => {
    const rounds = await db.rounds.where('gameId').equals(gameId).sortBy('index');
    const last = rounds.at(-1);
    if (!last) return;
    await db.rounds.delete(last.id);
    await db.conditionalRuleFirings.where('gameId').equals(gameId).filter((firing) => firing.roundIndex >= last.index).delete();
    await recomputeGameInTransaction(gameId);
  });
  const game = await db.games.get(gameId); if (game?.status === 'completed') await enqueueTelegramResult(gameId);
  else await db.telegramOutbox.where('gameId').equals(gameId).filter((item) => item.status !== 'sent').delete();
}

export async function deleteGame(gameId: string) {
  await db.transaction('rw', db.games, db.rounds, db.settings, db.conditionalRuleFirings, async () => {
    await db.rounds.where('gameId').equals(gameId).delete();
    await db.conditionalRuleFirings.where('gameId').equals(gameId).delete();
    await db.games.delete(gameId);
    const settings = await db.settings.get('main');
    if (settings?.lastActiveGameId === gameId) await db.settings.update('main', { lastActiveGameId: undefined });
  });
}

export async function exportBackup(): Promise<BackupFile> {
  const [games, rounds, players, presets, settings, messageRules, contentOverrides, conditionalRules, conditionalRuleFirings] = await Promise.all([db.games.toArray(), db.rounds.toArray(), db.players.toArray(), db.presets.toArray(), db.settings.toArray(), db.messageRules.toArray(), db.contentOverrides.toArray(), db.conditionalRules.toArray(), db.conditionalRuleFirings.toArray()]);
  const safeSettings = settings.map(withoutTelegramSecrets);
  return { app: 'KOK', version: 5, exportedAt: new Date().toISOString(), data: { games, rounds, players, presets, settings: safeSettings, messageRules, contentOverrides, conditionalRules, conditionalRuleFirings } };
}

export function isValidBackup(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false;
  const backup = value as Partial<BackupFile>;
  if (!((backup.app === 'Lammatna' || backup.app === 'KOK') && (backup.version === 1 || backup.version === 2 || backup.version === 3 || backup.version === 4 || backup.version === 5) && backup.data &&
    ['games', 'rounds', 'players', 'presets', 'settings'].every((key) => Array.isArray((backup.data as unknown as Record<string, unknown>)[key])))) return false;
  return backup.data.games.every((item) => typeof item?.id === 'string' && typeof item?.gameType === 'string' && Array.isArray(item?.players)) &&
    backup.data.rounds.every((item) => typeof item?.id === 'string' && typeof item?.gameId === 'string' && Number.isInteger(item?.index)) &&
    backup.data.players.every((item) => typeof item?.id === 'string' && typeof item?.name === 'string') &&
    backup.data.presets.every((item) => typeof item?.id === 'string' && Boolean(item?.rules)) && backup.data.settings.every((item) => item?.id === 'main');
}

export async function importBackup(backup: BackupFile, mode: 'merge' | 'replace') {
  await db.transaction('rw', [db.games, db.rounds, db.players, db.presets, db.settings, db.messageRules, db.contentOverrides, db.conditionalRules, db.conditionalRuleFirings], async () => {
    const localSettings = await db.settings.get('main');
    if (mode === 'replace') await Promise.all([db.games.clear(), db.rounds.clear(), db.players.clear(), db.presets.clear(), db.settings.clear(), db.messageRules.clear(), db.contentOverrides.clear(), db.conditionalRules.clear(), db.conditionalRuleFirings.clear()]);
    await db.games.bulkPut(backup.data.games);
    await db.rounds.bulkPut(backup.data.rounds);
    if (mode === 'replace') await db.players.bulkPut(backup.data.players);
    else for (const player of backup.data.players) {
      const existing = await db.players.where('name').equalsIgnoreCase(player.name).first();
      if (existing) await db.players.update(existing.id, { lastPlayedAt: (existing.lastPlayedAt ?? '') > (player.lastPlayedAt ?? '') ? existing.lastPlayedAt : player.lastPlayedAt });
      else await db.players.put(player);
    }
    await db.presets.bulkPut(backup.data.presets);
    const safeSettings = backup.data.settings.map((setting) => ({ ...withoutTelegramSecrets(setting), telegramBotToken: localSettings?.telegramBotToken, telegramChatId: localSettings?.telegramChatId, telegramThreadId: localSettings?.telegramThreadId, telegramAutoSend: localSettings?.telegramAutoSend, telegramBotUsername: localSettings?.telegramBotUsername } as AppSettings));
    await db.settings.bulkPut(safeSettings);
    if (backup.data.messageRules?.length) await db.messageRules.bulkPut(backup.data.messageRules);
    if (backup.data.contentOverrides?.length) await db.contentOverrides.bulkPut(backup.data.contentOverrides);
    if (backup.data.conditionalRules?.length) await db.conditionalRules.bulkPut(backup.data.conditionalRules);
    if (backup.data.conditionalRuleFirings?.length) await db.conditionalRuleFirings.bulkPut(backup.data.conditionalRuleFirings);
  });
  await initializeDatabase();
}

function withoutTelegramSecrets(setting: AppSettings): AppSettings {
  const safe = { ...setting }; delete safe.telegramBotToken; delete safe.telegramChatId; delete safe.telegramThreadId; return safe;
}

export async function clearAllData() {
  await db.transaction('rw', [db.games, db.rounds, db.players, db.presets, db.settings, db.messageRules, db.contentOverrides, db.conditionalRules, db.conditionalRuleFirings, db.audioAssets, db.audioEventMappings, db.telegramOutbox], async () => {
    await Promise.all([db.games.clear(), db.rounds.clear(), db.players.clear(), db.presets.clear(), db.settings.clear(), db.messageRules.clear(), db.contentOverrides.clear(), db.conditionalRules.clear(), db.conditionalRuleFirings.clear(), db.audioAssets.clear(), db.audioEventMappings.clear(), db.telegramOutbox.clear()]);
  });
  await initializeDatabase();
}
