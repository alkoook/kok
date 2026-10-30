import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, initializeDatabase } from '../db/database';
import type { TelegramOutboxItem } from '../types';
import { flushTelegramOutbox } from './outbox';

const item = (messageText = 'نتيجة'): TelegramOutboxItem => ({ id: 'g:1', kind: 'game_result_auto', sourceKey: 'g:1', gameId: 'g', gameType: 'likha', resultRevision: 1, messageText, resultSnapshot: { gameId: 'g', gameType: 'likha', resultRevision: 1, correction: false, finishReason: 'natural', finishedAt: new Date().toISOString(), players: [], standings: [], winnerIds: [], roundCount: 1 }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'pending', attemptCount: 0 });
describe('Telegram outbox', () => {
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDatabase(); await db.settings.update('main', { telegramBotToken: 't', telegramChatId: 'c' }); });
  afterEach(async () => { vi.unstubAllGlobals(); db.close(); });
  it('survives storage and sends pending items sequentially', async () => { const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true, result: { message_id: fetcher.mock.calls.length } }), { status: 200 }))); vi.stubGlobal('fetch', fetcher); await db.telegramOutbox.add(item(`${'س'.repeat(3700)}\n\n${'ص'.repeat(100)}`)); const result = await flushTelegramOutbox({ force: true }); expect(result.sent).toBe(1); expect(fetcher).toHaveBeenCalledTimes(2); expect(await db.telegramOutbox.get('g:1')).toMatchObject({ status: 'sent', attemptCount: 1, telegramMessageIds: [1, 2] }); });
  it('keeps a network failure retryable with backoff', async () => { vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline')))); await db.telegramOutbox.add(item()); await flushTelegramOutbox({ force: true }); const saved = await db.telegramOutbox.get('g:1'); expect(saved).toMatchObject({ status: 'failed_retryable', attemptCount: 1 }); expect(saved?.nextAttemptAt).toBeTruthy(); });
  it('keeps invalid configuration items without infinite retry', async () => { vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }), { status: 401 })))); await db.telegramOutbox.add(item()); const result = await flushTelegramOutbox({ force: true }); expect(result.configError).toBe('Unauthorized'); expect((await db.telegramOutbox.get('g:1'))?.status).toBe('failed_permanent'); });
});
