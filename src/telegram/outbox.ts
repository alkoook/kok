import { db } from '../db/database';
import type { TelegramOutboxItem } from '../types';
import { TelegramApiError, telegramSendMessage } from './api';
import { splitTelegramMessage } from './resultComposer';

const BACKOFF_MS = [30_000, 60_000, 300_000, 900_000, 3_600_000] as const;
let flushPromise: Promise<FlushResult> | undefined;
export type FlushResult = { sent: number; pending: number; configError?: string };

const nextBackoff = (attempt: number) => BACKOFF_MS[Math.min(Math.max(0, attempt - 1), BACKOFF_MS.length - 1)];
const due = (item: TelegramOutboxItem, now: number, force: boolean) => force || !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now;

async function sendItem(item: TelegramOutboxItem, force: boolean) {
  const settings = await db.settings.get('main'); if (!settings?.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) return { sent: false, configError: 'بيانات Telegram ناقصة.' };
  const now = Date.now(); if (!due(item, now, force)) return { sent: false };
  const attempt = item.attemptCount + 1; const started = new Date(now).toISOString(); await db.telegramOutbox.update(item.id, { status: 'sending', attemptCount: attempt, lastAttemptAt: started, updatedAt: started });
  try {
    const messageIds: number[] = [];
    for (const chunk of splitTelegramMessage(item.messageText)) messageIds.push((await telegramSendMessage(settings.telegramBotToken, settings.telegramChatId, chunk, settings.telegramThreadId)).message_id);
    const sentAt = new Date().toISOString(); await db.transaction('rw', db.telegramOutbox, db.settings, async () => { await db.telegramOutbox.update(item.id, { status: 'sent', sentAt, updatedAt: sentAt, nextAttemptAt: undefined, lastError: undefined, telegramMessageIds: messageIds }); await db.settings.update('main', { telegramLastSentAt: sentAt, telegramLastError: undefined }); });
    return { sent: true };
  } catch (error) {
    const apiError = error instanceof TelegramApiError ? error : new TelegramApiError('تعذر الوصول إلى تيليغرام.', undefined, true);
    const permanent = apiError.status === 400 || apiError.status === 401 || apiError.status === 403; const exhausted = attempt >= 8;
    const delay = apiError.retryAfterSeconds ? apiError.retryAfterSeconds * 1000 : nextBackoff(attempt);
    const updatedAt = new Date().toISOString(); const lastError = exhausted && !permanent ? 'توقفت المحاولات التلقائية بعد 8 محاولات. أعد الإرسال يدوياً.' : apiError.message; await db.transaction('rw', db.telegramOutbox, db.settings, async () => { await db.telegramOutbox.update(item.id, { status: permanent || exhausted ? 'failed_permanent' : 'failed_retryable', updatedAt, lastError, nextAttemptAt: permanent || exhausted ? undefined : new Date(Date.now() + delay).toISOString() }); await db.settings.update('main', { telegramLastError: apiError.status === 401 ? 'توكن البوت غير صالح.' : lastError }); });
    return { sent: false, configError: permanent ? apiError.message : undefined };
  }
}

async function runFlush(force: boolean): Promise<FlushResult> {
  const stale = new Date(Date.now() - 2 * 60_000).toISOString(); await db.telegramOutbox.where('status').equals('sending').filter((item) => (item.lastAttemptAt ?? '') < stale).modify({ status: 'failed_retryable', nextAttemptAt: new Date().toISOString() });
  const items = (await db.telegramOutbox.toArray()).filter((item) => item.status === 'pending' || item.status === 'failed_retryable' || force && item.status === 'failed_permanent').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let sent = 0; let configError: string | undefined;
  for (const item of items) { const result = await sendItem(item, force); if (result.sent) sent += 1; if (result.configError) { configError = result.configError; break; } }
  const pending = await db.telegramOutbox.filter((item) => item.status !== 'sent').count(); return { sent, pending, configError };
}

export function flushTelegramOutbox(options: { force?: boolean } = {}) { if (!flushPromise) flushPromise = runFlush(Boolean(options.force)).finally(() => { flushPromise = undefined; }); return flushPromise; }
export async function retryOutboxItem(id: string) { await db.telegramOutbox.update(id, { status: 'pending', attemptCount: 0, nextAttemptAt: undefined, lastError: undefined }); return flushTelegramOutbox({ force: true }); }
export async function deleteOutboxItem(id: string) { await db.telegramOutbox.delete(id); }
export async function resetPermanentTelegramFailures() { await db.telegramOutbox.where('status').equals('failed_permanent').modify({ status: 'pending', nextAttemptAt: undefined, lastError: undefined }); }
