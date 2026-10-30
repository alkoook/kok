import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';

async function dismissOnboarding(page) {
  const button = page.getByRole('button', { name: 'جاهزين، ابدأ' });
  if (await button.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) await button.click();
}

test('weekly court is mobile-safe and exposes hero, donkey and previous weeks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}#/weekly-donkey`);
  await dismissOnboarding(page);

  await expect(page.getByRole('heading', { name: 'أبطال وحمير' })).toBeVisible();
  await expect(page.getByText('السبت 10:00 صباحاً', { exact: false })).toBeVisible();
  await expect(page.getByRole('tab', { name: '👑 البطل' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('لسا ما حدا استحق التاج.')).toBeVisible();

  await page.getByRole('tab', { name: '🐴 الحمار' }).click();
  await expect(page.getByText('لسا ما حدا سجل تعثرات كافية.')).toBeVisible();
  await page.getByRole('button', { name: 'الأسبوع السابق' }).click();
  await expect(page.getByText('أسبوع سابق')).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
