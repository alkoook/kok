import { db } from '../db/database';
import { uid } from '../utils';
import type { AudioEvent, UploadedAudioAsset } from './types';

export const MAX_AUDIO_FILE_SIZE = 10 * 1024 * 1024;
const supportedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'];

export function validateAudioFile(file: File): string | undefined {
  if (file.size > MAX_AUDIO_FILE_SIZE) return 'حجم الملف أكبر من 10 MB.';
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
  if (!file.type.startsWith('audio/') || !supportedExtensions.includes(extension)) return 'اختر ملفًا صوتيًا صالحًا من نوع MP3 أو WAV أو OGG أو M4A.';
}

export async function readAudioDuration(file: Blob): Promise<number | undefined> {
  if (typeof Audio === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined;
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number | undefined>((resolve) => {
      const audio = new Audio(); const finish = (value?: number) => { audio.removeAttribute('src'); audio.load(); resolve(value); };
      const timer = window.setTimeout(() => finish(), 4000);
      audio.onloadedmetadata = () => { window.clearTimeout(timer); finish(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined); };
      audio.onerror = () => { window.clearTimeout(timer); finish(); }; audio.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

export async function saveUploadedAudio(file: File, durationReader: (blob: Blob) => Promise<number | undefined> = readAudioDuration): Promise<UploadedAudioAsset> {
  const error = validateAudioFile(file); if (error) throw new Error(error);
  const timestamp = new Date().toISOString(); const durationMs = await durationReader(file);
  if (durationReader === readAudioDuration && typeof Audio !== 'undefined' && durationMs === undefined) throw new Error('تعذر قراءة الملف الصوتي أو أن التنسيق غير مدعوم على هذا المتصفح.');
  const asset: UploadedAudioAsset = { id: uid(), name: file.name.replace(/\.[^.]+$/, ''), source: 'uploaded', mimeType: file.type, blob: file, size: file.size, durationMs, createdAt: timestamp, updatedAt: timestamp };
  await db.audioAssets.add(asset); return asset;
}

export const renameUploadedAudio = (id: string, name: string) => db.audioAssets.update(id, { name: name.trim(), updatedAt: new Date().toISOString() });
export async function deleteUploadedAudio(id: string): Promise<void> {
  await db.transaction('rw', db.audioAssets, db.audioEventMappings, async () => { await db.audioAssets.delete(id); await db.audioEventMappings.where('assetId').equals(id).delete(); });
}
export async function deleteAllUploadedAudio(): Promise<void> {
  await db.transaction('rw', db.audioAssets, db.audioEventMappings, async () => { const ids = new Set((await db.audioAssets.toArray()).map((asset) => asset.id)); await db.audioAssets.clear(); await db.audioEventMappings.filter((mapping) => ids.has(mapping.assetId)).delete(); });
}
export async function totalUploadedAudioSize(): Promise<number> { return (await db.audioAssets.toArray()).reduce((total, asset) => total + asset.size, 0); }
export async function setEventAudioMapping(event: AudioEvent, assetId?: string): Promise<void> { if (!assetId) await db.audioEventMappings.delete(event); else await db.audioEventMappings.put({ event, assetId, updatedAt: new Date().toISOString() }); }
