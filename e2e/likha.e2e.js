import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';
const names = ['Ahmed', 'Ali', 'Omar', 'Ziad'];
async function dismissOnboarding(page) { const button = page.getByRole('button', { name: 'جاهزين، ابدأ' }); if (await button.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) await button.click(); }
async function addPlayers(page) { for (const name of names) { await page.getByPlaceholder('اسم اللاعب المؤقت').fill(name); await page.getByRole('button', { name: 'إضافة', exact: true }).click(); } }

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`Likha entry stays usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport); await page.goto(`${base}#/new/likha`); await dismissOnboarding(page); await expect(page.getByText('210', { exact: true })).toBeVisible(); await addPlayers(page); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
    await expect(page.getByRole('button', { name: 'زيادة كوبا Ahmed' })).toBeVisible(); await expect(page.getByText('بنت البستوني')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('Likha saves ownership, doubling, history and undo on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}#/new/likha`); await dismissOnboarding(page); await addPlayers(page); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  for (let count = 0; count < 13; count += 1) await page.getByRole('button', { name: 'زيادة كوبا Ahmed' }).click();
  const cards = page.locator('section').filter({ hasText: 'الورق الخاص' }).locator('article');
  await cards.nth(0).getByRole('button', { name: 'Ali', exact: true }).click(); await cards.nth(0).getByRole('button', { name: '×2 مدبل' }).click();
  await cards.nth(1).getByRole('button', { name: 'Ahmed', exact: true }).click(); await cards.nth(2).getByRole('button', { name: 'Omar', exact: true }).click(); await cards.nth(3).getByRole('button', { name: 'Ziad', exact: true }).click();
  await page.getByRole('button', { name: 'سجّل الجولة' }).click(); await expect(page.getByText(/26 نقطة|بنت مدبلة|مدبلة كمان|البنت ×2/)).toBeVisible(); await page.getByRole('button', { name: 'إغلاق' }).click();
  await page.getByRole('button', { name: 'سجل الجولات' }).click(); await expect(page.getByText('👑 بنت البستوني: Ali · ×2 مدبلة')).toBeVisible(); await expect(page.getByText('♦ 10 الديناري: Ahmed · عادي')).toBeVisible(); await page.getByRole('button', { name: 'إغلاق' }).click();
  await page.getByRole('button', { name: 'تراجع', exact: true }).click(); await page.getByRole('button', { name: 'تراجع', exact: true }).last().click(); await expect(page.getByText('المجموع بعد الجولة: 0').first()).toBeVisible();
});

test('Likha partnership uses A+B versus C+D and shows live official totals', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}#/new/likha`); await dismissOnboarding(page);
  await page.getByRole('button', { name: 'شراكة', exact: true }).click(); await addPlayers(page);
  await expect(page.getByText('المقعد 1 + 2 ضد المقعد 3 + 4 — رتّب المقاعد لتحديد الشركاء')).toBeVisible();
  await expect(page.getByText('Ahmed + Ali', { exact: true })).toBeVisible(); await expect(page.getByText('Omar + Ziad', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  await expect(page.getByText('أربعة لاعبين · شراكة')).toBeVisible(); await expect(page.getByText('النتيجة الرسمية المباشرة')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('weekly donkey empty state is deterministic and responsive', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}#/weekly-donkey`); await dismissOnboarding(page); await expect(page.getByText('الأسبوع هاد لسا ما فضح حدا.')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
