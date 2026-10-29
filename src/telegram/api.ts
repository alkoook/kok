export type TelegramBotIdentity = { id: number; username?: string; first_name: string };
export type TelegramSendResult = { message_id: number };
type TelegramEnvelope<T> = { ok: boolean; result?: T; error_code?: number; description?: string; parameters?: { retry_after?: number } };

export class TelegramApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly retryable = false, public readonly retryAfterSeconds?: number, public readonly ambiguous = false) { super(message); this.name = 'TelegramApiError'; }
}

const cleanToken = (token: string) => token.replace(/\s+/g, '');
async function callTelegram<T>(token: string, method: string, body?: Record<string, unknown>, fetcher: typeof fetch = fetch, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try { response = await fetcher(`https://api.telegram.org/bot${cleanToken(token)}/${method}`, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal: controller.signal }); }
    catch (error) { const timedOut = error instanceof DOMException && error.name === 'AbortError'; throw new TelegramApiError(timedOut ? 'انتهت مهلة الاتصال بتيليغرام.' : 'تعذر الوصول إلى تيليغرام.', undefined, true, undefined, timedOut); }
    let payload: TelegramEnvelope<T> | undefined; try { payload = await response.json() as TelegramEnvelope<T>; } catch { /* Telegram normally returns JSON; preserve the HTTP classification. */ }
    if (response.ok && payload?.ok && payload.result !== undefined) return payload.result;
    const status = payload?.error_code ?? response.status; const description = payload?.description?.trim() || `Telegram HTTP ${status}`; const retryAfter = payload?.parameters?.retry_after;
    const retryable = status === 429 || status >= 500; throw new TelegramApiError(description, status, retryable, retryAfter);
  } finally { clearTimeout(timeout); }
}

export const telegramGetMe = (token: string, fetcher?: typeof fetch) => callTelegram<TelegramBotIdentity>(token, 'getMe', undefined, fetcher);
export const telegramSendMessage = (token: string, chatId: string, text: string, threadId?: string, fetcher?: typeof fetch) => callTelegram<TelegramSendResult>(token, 'sendMessage', { chat_id: chatId.trim(), text, ...(threadId?.trim() ? { message_thread_id: Number(threadId.trim()) } : {}) }, fetcher);
