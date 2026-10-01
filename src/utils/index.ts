import type { GameType } from '../types';

export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const GAME_LABELS: Record<GameType, string> = {
  'trix-slow': 'تركس بطيئة',
  'trix-fast': 'تركس سريعة',
  cc: 'CC',
  'tarneeb-61': 'طرنيب 61',
  'tarneeb-41': 'طرنيب سوري 41'
};

export const isTrix = (type: GameType) => type.startsWith('trix');
export const formatDate = (iso: string) => new Intl.DateTimeFormat('ar-SY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export const formatDuration = (start: string, end?: string) => {
  const minutes = Math.max(0, Math.round(((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 60000));
  if (minutes < 60) return `${minutes} دقيقة`;
  return `${Math.floor(minutes / 60)} س ${minutes % 60} د`;
};
export const scoreText = (value: number) => (value > 0 ? `+${value}` : String(value));
