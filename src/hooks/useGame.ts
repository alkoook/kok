import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

export function useGame(gameId?: string) {
  const game = useLiveQuery(() => (gameId ? db.games.get(gameId) : undefined), [gameId]);
  const rounds = useLiveQuery(() => (gameId ? db.rounds.where('gameId').equals(gameId).sortBy('index') : []), [gameId], []);
  return { game, rounds };
}
