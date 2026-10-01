import Dexie, { type EntityTable } from 'dexie';
import { aggregatePartnershipScores, calculateTrixRound, validateKingdomBalance, validatePartnershipKingdomBalance, validateTrixInput } from '../games/trix/scoring';
import { DEFAULT_TRIX_RULES, FAST_CONTRACTS, SLOW_CONTRACTS } from '../games/trix/rules';
import { createUnconfirmedTarneebRules } from '../games/tarneeb/rules';
import { calculateTarneeb41Round, calculateTarneeb61Round, deriveTarneeb41Phase, determineTarneeb41Winner, determineTarneebWinner } from '../games/tarneeb/scoring';
import type { AppSettings, BackupFile, GameRound, GameSession, PlayerProfile, RulePreset, Tarneeb41RoundInput, TarneebRoundInput, TrixRoundInput } from '../types';
import { isTrix, uid } from '../utils';

class KokDatabase extends Dexie {
  games!: EntityTable<GameSession, 'id'>;
  rounds!: EntityTable<GameRound, 'id'>;
  players!: EntityTable<PlayerProfile, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;
  presets!: EntityTable<RulePreset, 'id'>;

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
  }
}

export const db = new KokDatabase();
export const DEFAULT_SETTINGS: AppSettings = { id: 'main', theme: 'system', vibration: true, keepAwake: false, roundReactions: true, onboardingSeen: false };

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
  await db.transaction('rw', db.settings, db.presets, async () => {
    const settings = await db.settings.get('main');
    if (!settings) await db.settings.add(DEFAULT_SETTINGS);
    else if (settings.roundReactions === undefined) await db.settings.update('main', { roundReactions: true });
    for (const preset of initialPresets()) if (!(await db.presets.get(preset.id))) await db.presets.add(preset);
    for (const id of ['trix-slow', 'trix-fast'] as const) {
      const preset = await db.presets.get(id);
      if (preset && 'kingPenalty' in preset.rules && preset.rules.version !== 2) {
        await db.presets.update(id, { rules: { ...preset.rules, version: 2, doublingEnabled: true }, updatedAt: new Date().toISOString() });
      }
    }
  });
}

export async function createGame(session: GameSession) {
  await db.transaction('rw', db.games, db.players, db.settings, async () => {
    await db.games.add(session);
    for (const player of session.players) {
      const existing = await db.players.where('name').equalsIgnoreCase(player.name).first();
      if (existing) await db.players.update(existing.id, { gamesPlayed: existing.gamesPlayed + 1, lastPlayedAt: session.createdAt });
      else await db.players.add({ id: player.id, name: player.name, gamesPlayed: 1, lastPlayedAt: session.createdAt });
    }
    await db.settings.update('main', { lastActiveGameId: session.id });
  });
}

const sumScores = (base: Record<string, number>, delta: Record<string, number>, allowNegative = true) =>
  Object.fromEntries(Object.keys(base).map((id) => [id, allowNegative ? base[id] + (delta[id] ?? 0) : Math.max(0, base[id] + (delta[id] ?? 0))]));

const scoreIdsForGame = (game: GameSession) => game.rulesSnapshot.kind === 'tarneeb-41-v2' || isTrix(game.gameType)
  ? game.players.map((player) => player.id)
  : game.teams?.map((team) => team.id) ?? game.players.map((player) => player.id);

function validateCompletedTrixKingdoms(game: GameSession, rounds: GameRound[]) {
  if (!isTrix(game.gameType)) return;
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
  if (isTrix(game.gameType)) {
    const total = game.gameType === 'trix-slow' ? 20 : 8;
    if (rounds.filter((round) => round.type !== 'manual-adjustment').length < total) return { status: 'active' as const, winnerIds: undefined };
    const rankedScores = game.trixMode === 'partnership' && game.teams ? aggregatePartnershipScores(scores, game.teams) : scores;
    const best = Math.max(...Object.values(rankedScores));
    return { status: 'completed' as const, winnerIds: Object.keys(rankedScores).filter((id) => rankedScores[id] === best) };
  }
  if (game.rulesSnapshot.kind === 'tarneeb-61-v2') {
    const reached = Object.entries(scores).filter(([, score]) => score >= 61);
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
    if (game.rulesSnapshot.kind === 'tarneeb-41-v2' && round.type === 'tarneeb-41' && game.teams) {
      const entries = (round.input as Tarneeb41RoundInput).entries.map(({ playerId, bid, actualTricks }) => ({ playerId, bid, actualTricks }));
      const calculated = calculateTarneeb41Round(entries, deriveTarneeb41Phase(scores, game.teams), game.players, game.rulesSnapshot.rules);
      input = calculated.input;
      scoreDelta = calculated.delta;
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
    finishedAt: completion.status === 'completed' ? game.finishedAt ?? now : undefined
  });
  if (completion.status === 'completed') {
    const settings = await db.settings.get('main');
    if (settings?.lastActiveGameId === gameId) await db.settings.update('main', { lastActiveGameId: undefined });
  } else await db.settings.update('main', { lastActiveGameId: gameId });
  return db.games.get(gameId);
}

export async function recomputeGame(gameId: string) {
  return db.transaction('rw', db.games, db.rounds, db.settings, () => recomputeGameInTransaction(gameId));
}

function normalizeNewRound(game: GameSession, round: Omit<GameRound, 'id' | 'index' | 'scoreAfter' | 'createdAt'>) {
  if (game.rulesSnapshot.kind === 'tarneeb-61-v2' && round.type === 'tarneeb' && game.teams) {
    return { ...round, scoreDelta: calculateTarneeb61Round(round.input as TarneebRoundInput, [game.teams[0].id, game.teams[1].id], game.rulesSnapshot.rules).delta };
  }
  if (game.rulesSnapshot.kind === 'tarneeb-41-v2' && round.type === 'tarneeb-41' && game.teams) {
    const entries = (round.input as Tarneeb41RoundInput).entries.map(({ playerId, bid, actualTricks }) => ({ playerId, bid, actualTricks }));
    const calculated = calculateTarneeb41Round(entries, deriveTarneeb41Phase(game.scores, game.teams), game.players, game.rulesSnapshot.rules);
    return { ...round, input: calculated.input, scoreDelta: calculated.delta };
  }
  if (game.rulesSnapshot.kind === 'trix' && round.type !== 'manual-adjustment') {
    const input = round.input as TrixRoundInput;
    if (!validateTrixInput(input, game.rulesSnapshot.rules)) throw new Error('جولة تركس غير مكتملة');
    return { ...round, scoreDelta: calculateTrixRound(input, game.players, game.rulesSnapshot.rules, game.teams) };
  }
  return round;
}

export async function addRound(round: Omit<GameRound, 'id' | 'index' | 'scoreAfter' | 'createdAt'>) {
  return db.transaction('rw', db.games, db.rounds, db.settings, async () => {
    const game = await db.games.get(round.gameId);
    if (!game || game.status !== 'active') throw new Error('لا يمكن إضافة جولة لهذه المباراة');
    const normalized = normalizeNewRound(game, round);
    const existingRounds = await db.rounds.where('gameId').equals(round.gameId).sortBy('index');
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
}

export async function replaceRound(roundId: string, updates: Pick<GameRound, 'input' | 'scoreDelta' | 'type' | 'note'>) {
  return db.transaction('rw', db.games, db.rounds, db.settings, async () => {
    const round = await db.rounds.get(roundId);
    if (!round) throw new Error('الجولة غير موجودة');
    await db.rounds.update(roundId, updates);
    return recomputeGameInTransaction(round.gameId);
  });
}

export async function undoLastRound(gameId: string) {
  return db.transaction('rw', db.games, db.rounds, db.settings, async () => {
    const rounds = await db.rounds.where('gameId').equals(gameId).sortBy('index');
    const last = rounds.at(-1);
    if (!last) return;
    await db.rounds.delete(last.id);
    await recomputeGameInTransaction(gameId);
  });
}

export async function deleteGame(gameId: string) {
  await db.transaction('rw', db.games, db.rounds, db.settings, async () => {
    await db.rounds.where('gameId').equals(gameId).delete();
    await db.games.delete(gameId);
    const settings = await db.settings.get('main');
    if (settings?.lastActiveGameId === gameId) await db.settings.update('main', { lastActiveGameId: undefined });
  });
}

export async function exportBackup(): Promise<BackupFile> {
  const [games, rounds, players, presets, settings] = await Promise.all([db.games.toArray(), db.rounds.toArray(), db.players.toArray(), db.presets.toArray(), db.settings.toArray()]);
  return { app: 'KOK', version: 2, exportedAt: new Date().toISOString(), data: { games, rounds, players, presets, settings } };
}

export function isValidBackup(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false;
  const backup = value as Partial<BackupFile>;
  if (!((backup.app === 'Lammatna' || backup.app === 'KOK') && (backup.version === 1 || backup.version === 2) && backup.data &&
    ['games', 'rounds', 'players', 'presets', 'settings'].every((key) => Array.isArray((backup.data as unknown as Record<string, unknown>)[key])))) return false;
  return backup.data.games.every((item) => typeof item?.id === 'string' && typeof item?.gameType === 'string' && Array.isArray(item?.players)) &&
    backup.data.rounds.every((item) => typeof item?.id === 'string' && typeof item?.gameId === 'string' && Number.isInteger(item?.index)) &&
    backup.data.players.every((item) => typeof item?.id === 'string' && typeof item?.name === 'string') &&
    backup.data.presets.every((item) => typeof item?.id === 'string' && Boolean(item?.rules)) && backup.data.settings.every((item) => item?.id === 'main');
}

export async function importBackup(backup: BackupFile, mode: 'merge' | 'replace') {
  await db.transaction('rw', db.games, db.rounds, db.players, db.presets, db.settings, async () => {
    if (mode === 'replace') await Promise.all([db.games.clear(), db.rounds.clear(), db.players.clear(), db.presets.clear(), db.settings.clear()]);
    await db.games.bulkPut(backup.data.games);
    await db.rounds.bulkPut(backup.data.rounds);
    if (mode === 'replace') await db.players.bulkPut(backup.data.players);
    else for (const player of backup.data.players) {
      const existing = await db.players.where('name').equalsIgnoreCase(player.name).first();
      if (existing) await db.players.update(existing.id, { gamesPlayed: Math.max(existing.gamesPlayed, player.gamesPlayed), lastPlayedAt: existing.lastPlayedAt > player.lastPlayedAt ? existing.lastPlayedAt : player.lastPlayedAt });
      else await db.players.put(player);
    }
    await db.presets.bulkPut(backup.data.presets);
    await db.settings.bulkPut(backup.data.settings);
  });
  await initializeDatabase();
}

export async function clearAllData() {
  await db.transaction('rw', db.games, db.rounds, db.players, db.presets, db.settings, async () => {
    await Promise.all([db.games.clear(), db.rounds.clear(), db.players.clear(), db.presets.clear(), db.settings.clear()]);
  });
  await initializeDatabase();
}
