import { test, expect } from '@playwright/test';

test('production PWA registers, caches, and reloads offline', async ({ page, context, request }) => {
  const manifest = await request.get('http://127.0.0.1:4173/manifest.webmanifest'); expect(manifest.ok()).toBe(true); const data = await manifest.json(); expect(data).toMatchObject({ display: 'standalone', dir: 'rtl', lang: 'ar' }); expect(data.icons.length).toBeGreaterThanOrEqual(3);
  let appPage = page;
  await appPage.goto('http://127.0.0.1:4173/'); const onboarding = appPage.getByRole('button', { name: 'جاهزين، ابدأ' }); if (await onboarding.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)) await onboarding.click();
  await appPage.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active), null, { timeout: 10000 });
  if (!await appPage.evaluate(() => Boolean(navigator.serviceWorker.controller))) { await appPage.close(); appPage = await context.newPage(); await appPage.goto('http://127.0.0.1:4173/'); }
  await appPage.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
  await context.setOffline(true); await appPage.reload(); await expect(appPage.getByRole('heading', { name: 'لعبة جديدة' })).toBeVisible(); await expect(appPage.getByText('بدون إنترنت').first()).toBeVisible();
  await context.setOffline(false); await appPage.goto('http://127.0.0.1:4173/#/settings'); await expect(appPage.getByRole('heading', { name: 'الإعدادات' })).toBeVisible();
});
