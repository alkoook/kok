import { flushTelegramOutbox } from './outbox';

export const TELEGRAM_SYNC_TAG = 'telegram-outbox-sync';
type SyncCapableRegistration = ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };

export async function registerTelegramBackgroundSync() {
  if (!('serviceWorker' in navigator)) return false;
  try { const registration = await navigator.serviceWorker.ready as SyncCapableRegistration; if (!registration.sync) return false; await registration.sync.register(TELEGRAM_SYNC_TAG); return true; } catch { return false; }
}

export function installTelegramOutboxTriggers() {
  let lastTrigger = 0; const trigger = (force = false) => { const now = Date.now(); if (!force && now - lastTrigger < 1500) return; lastTrigger = now; void flushTelegramOutbox({ force }); };
  const online = () => trigger(true);
  const focus = () => trigger();
  const visible = () => { if (document.visibilityState === 'visible') trigger(); };
  window.addEventListener('online', online); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', visible); trigger();
  return () => { window.removeEventListener('online', online); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', visible); };
}
