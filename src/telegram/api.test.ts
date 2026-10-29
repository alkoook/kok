import { describe, expect, it, vi } from 'vitest';
import { TelegramApiError, telegramGetMe, telegramSendMessage } from './api';

const response = (status: number, payload: unknown) => Promise.resolve(new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } }));
describe('Telegram API', () => {
  it('cleans token and reads getMe identity', async () => { const fetcher = vi.fn((input: string | URL | Request) => { expect(String(input)).toContain('api.telegram.org'); return response(200, { ok: true, result: { id: 1, username: 'kok_bot', first_name: 'KOK' } }); }); expect(await telegramGetMe(' 123 : ABC \n', fetcher as typeof fetch)).toMatchObject({ username: 'kok_bot' }); expect(String(fetcher.mock.calls[0][0])).toContain('/bot123:ABC/getMe'); });
  it.each([[401, 'Unauthorized'], [400, 'chat not found'], [403, 'bot was blocked']])('surfaces Telegram %i descriptions as permanent errors', async (status, description) => { const promise = telegramSendMessage('t', 'c', 'x', undefined, (() => response(status, { ok: false, error_code: status, description })) as typeof fetch); await expect(promise).rejects.toMatchObject({ status, message: description, retryable: false }); });
  it('honors 429 retry_after', async () => { await expect(telegramSendMessage('t', 'c', 'x', undefined, (() => response(429, { ok: false, error_code: 429, description: 'Too Many Requests', parameters: { retry_after: 17 } })) as typeof fetch)).rejects.toMatchObject({ status: 429, retryable: true, retryAfterSeconds: 17 }); });
  it('marks 500 and network throws retryable', async () => { await expect(telegramGetMe('t', (() => response(500, { ok: false, error_code: 500, description: 'server' })) as typeof fetch)).rejects.toMatchObject({ retryable: true }); await expect(telegramGetMe('t', vi.fn(() => Promise.reject(new TypeError('offline'))) as typeof fetch)).rejects.toBeInstanceOf(TelegramApiError); });
});
