import { db } from '../db/database';
import type { GameRound, GameSession, PlayerProfile } from '../types';
import { uid } from '../utils';

export async function resizePlayerPhoto(file: File, maxDimension = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر تجهيز الصورة')), 'image/webp', .82));
}

export async function savePlayer(input: { id?: string; name: string; photo?: Blob | null }): Promise<PlayerProfile> {
  const name = input.name.trim();
  if (!name) throw new Error('اسم اللاعب مطلوب');
  const duplicate = await db.players.where('name').equalsIgnoreCase(name).first();
  if (duplicate && duplicate.id !== input.id) throw new Error('هذا الاسم موجود مسبقًا');
  const now = new Date().toISOString();
  const existing = input.id ? await db.players.get(input.id) : undefined;
  const player: PlayerProfile = { id: input.id ?? uid(), name, createdAt: existing?.createdAt ?? now, updatedAt: now, lastPlayedAt: existing?.lastPlayedAt, ...(input.photo === null ? {} : { photo: input.photo ?? existing?.photo }) };
  await db.players.put(player);
  return player;
}

export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id);
}

export type PlayerStats = { games: number; wins: number; losses: number; bestLash?: number; worstLash?: number; averageLash?: number; positiveLash: number; disasters: number; trixRanks: [number, number, number, number]; oldMan: number; doubledOldMan: number; ownOldMan: number; ownDoubledOldMan: number };

export function playerStats(profileId: string, games: GameSession[], rounds: GameRound[]): PlayerStats {
  const sessions = games.filter((game) => game.players.some((player) => player.profileId === profileId));
  const ids = new Map(sessions.map((game) => [game.id, game.players.find((player) => player.profileId === profileId)!.id]));
  const lashScores: number[] = []; const ranks = [0, 0, 0, 0] as [number, number, number, number]; let oldMan = 0; let doubledOldMan = 0; let ownOldMan = 0; let ownDoubledOldMan = 0;
  rounds.forEach((round) => {
    const playerId = ids.get(round.gameId); if (!playerId) return;
    if (round.type === 'lash' && 'kind' in round.input && round.input.kind === 'lash') { const score = round.input.scoresByPlayer[playerId]; if (score !== undefined) lashScores.push(score); if (round.input.oldMan.eaterPlayerId === playerId) { oldMan += 1; if (round.input.oldMan.doubled) doubledOldMan += 1; const game = sessions.find((item) => item.id === round.gameId); const owner = game && game.players[(Math.max(0, game.players.findIndex((p) => p.id === game.firstKingdomOwnerId)) + (round.kingdomIndex ?? 0)) % 4]; if (owner?.id === playerId) { ownOldMan += 1; if (round.input.oldMan.doubled) ownDoubledOldMan += 1; } } }
    if (round.type === 'trix-ranking' && 'kind' in round.input && round.input.kind === 'trix-ranking') { const rank = round.input.finishingOrder.indexOf(playerId); if (rank >= 0) ranks[rank] += 1; }
  });
  const completed = sessions.filter((game) => game.status === 'completed');
  const wins = completed.filter((game) => { const player = game.players.find((item) => item.profileId === profileId)!; const team = game.teams?.find((item) => item.playerIds.includes(player.id)); return game.winnerIds?.includes(team?.id ?? player.id); }).length;
  return { games: sessions.length, wins, losses: completed.length - wins, bestLash: lashScores.length ? Math.max(...lashScores) : undefined, worstLash: lashScores.length ? Math.min(...lashScores) : undefined, averageLash: lashScores.length ? lashScores.reduce((sum, value) => sum + value, 0) / lashScores.length : undefined, positiveLash: lashScores.filter((value) => value > 0).length, disasters: lashScores.filter((value) => value <= -500).length, trixRanks: ranks, oldMan, doubledOldMan, ownOldMan, ownDoubledOldMan };
}
