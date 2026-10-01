import { test, expect } from '@playwright/test';

test('production PWA registers, caches, and reloads offline', async ({ page, context, request }) => {
  const manifest = await request.get('http://127.0.0.1:4173/manifest.webmanifest'); expect(manifest.ok()).toBe(true); const data = await manifest.json(); expect(data).toMatchObject({ display: 'standalone', dir: 'rtl', lang: 'ar' }); expect(data.icons.length).toBeGreaterThanOrEqual(3);
  await page.goto('http://127.0.0.1:4173/'); const onboarding = page.getByRole('button', { name: 'جاهزين، ابدأ' }); if (await onboarding.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)) await onboarding.click();
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.active), null, { timeout: 10000 });
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
  await context.setOffline(true); await page.reload(); await expect(page.getByRole('heading', { name: 'لعبة جديدة' })).toBeVisible(); await expect(page.getByText('بدون إنترنت').first()).toBeVisible();
  await context.setOffline(false); await page.goto('http://127.0.0.1:4173/#/settings'); await expect(page.getByRole('heading', { name: 'الإعدادات' })).toBeVisible();
});
