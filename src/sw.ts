/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { flushTelegramOutbox } from './telegram/outbox';
import { TELEGRAM_SYNC_TAG } from './telegram/lifecycle';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<unknown> };
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting(); });
self.addEventListener('sync', (event) => {
  const syncEvent = event as Event & { tag: string; waitUntil(promise: Promise<unknown>): void };
  if (syncEvent.tag === TELEGRAM_SYNC_TAG) syncEvent.waitUntil(flushTelegramOutbox());
});
