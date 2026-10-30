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
  const cards = page.getByTestId('likha-special-cards').locator('article');
  await cards.nth(0).getByRole('button', { name: 'Ali', exact: true }).click(); await cards.nth(0).getByRole('button', { name: '×2 مدبل' }).click();
  await cards.nth(1).getByRole('button', { name: 'Ahmed', exact: true }).click(); await cards.nth(2).getByRole('button', { name: 'Omar', exact: true }).click(); await cards.nth(3).getByRole('button', { name: 'Ziad', exact: true }).click();
  await page.getByRole('button', { name: 'سجّل الجولة' }).click(); await expect(page.getByRole('complementary')).toBeVisible(); await page.getByRole('button', { name: 'إغلاق' }).click();
  await page.getByRole('button', { name: 'الجولات' }).click(); await expect(page.getByText('👑 بنت البستوني: Ali · ×2 مدبلة')).toBeVisible(); await expect(page.getByText('♦ 10 الديناري: Ahmed · عادي')).toBeVisible(); await page.getByRole('button', { name: 'إغلاق' }).click();
  await page.getByRole('button', { name: 'تراجع', exact: true }).click(); await page.getByRole('button', { name: 'تراجع', exact: true }).last().click(); await expect(page.getByText('بعد الجولة: 0').first()).toBeVisible();
});

test('Likha partnership uses opposite seats and one-side team scoring', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}#/new/likha`); await dismissOnboarding(page);
  await page.getByRole('button', { name: 'شراكة', exact: true }).click(); await addPlayers(page);
  await expect(page.getByText('المقعد 1 + 3 ضد المقعد 2 + 4')).toBeVisible();
  await expect(page.getByText('Ahmed + Omar', { exact: true })).toBeVisible(); await expect(page.getByText('Ali + Ziad', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  await expect(page.getByText('أربعة لاعبين · شراكة')).toBeVisible(); await expect(page.getByText('النتيجة الرسمية', { exact: true })).toBeVisible(); await expect(page.getByTestId('likha-official-team-score').locator('article')).toHaveCount(2);
  await expect(page.getByText('تم تصميم هذا التطبيق بواسطة أخوك أبو عمر استمتع بالرحلة ✌️🖤')).toBeVisible();
  await expect(page.getByRole('button', { name: 'زيادة كوبا Ahmed', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('likha-derived-hearts')).toHaveText('13');
  for (let count = 0; count < 10; count += 1) await page.getByRole('button', { name: 'زيادة كوبا Ahmed + Omar' }).click();
  await expect(page.getByTestId('likha-derived-hearts')).toHaveText('3');
  const cards = page.getByTestId('likha-special-cards').locator('article');
  await cards.nth(0).getByRole('button', { name: 'Ahmed + Omar', exact: true }).click();
  await cards.nth(1).getByRole('button', { name: 'Ali + Ziad', exact: true }).click(); await cards.nth(1).getByRole('button', { name: '×2 مدبل' }).click();
  await cards.nth(2).getByRole('button', { name: 'Ahmed + Omar', exact: true }).click(); await cards.nth(2).getByRole('button', { name: '×2 مدبل' }).click();
  await cards.nth(3).getByRole('button', { name: 'Ali + Ziad', exact: true }).click();
  await expect(page.getByTestId('likha-team-preview')).toContainText('المجموع: -51'); await expect(page.getByTestId('likha-team-preview')).toContainText('المجموع: +6');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.getByRole('button', { name: 'سجّل الجولة' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const teamCardColor = await page.getByTestId('likha-official-team-score').locator('article').first().evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(teamCardColor).not.toBe('rgb(255, 255, 255)');
});

test('global signature stays in layout flow and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base); await dismissOnboarding(page);
  const signature = page.getByText('تم تصميم هذا التطبيق بواسطة أخوك أبو عمر استمتع بالرحلة ✌️🖤');
  await expect(signature).toBeVisible();
  expect(await signature.evaluate((node) => ({ position: getComputedStyle(node).position, animation: getComputedStyle(node).animationName }))).toEqual({ position: 'relative', animation: 'none' });
});

test('weekly donkey empty state is deterministic and responsive', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}#/weekly-donkey`); await dismissOnboarding(page); await page.getByRole('tab', { name: '🐴 الحمار' }).click(); await expect(page.getByText('لسا ما حدا سجل تعثرات كافية.')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
