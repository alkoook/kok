import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';

async function dismissOnboarding(page) {
  const button = page.getByRole('button', { name: 'جاهزين، ابدأ' });
  if (await button.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)) await button.click();
}

for (const width of [360, 390, 412, 1280]) {
  test(`home RTL responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 844 });
    await page.goto(base); await dismissOnboarding(page);
    await expect(page.getByRole('heading', { name: 'لعبة جديدة' })).toBeVisible();
    await expect(page.getByText('CC', { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('Fast Trix manual flow, validation, ranking and persisted refresh', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base); await dismissOnboarding(page);
  await page.getByText('تركس سريعة', { exact: true }).click();
  const names = ['أحمد', 'عمر', 'علي', 'زياد']; const inputs = page.locator('input[placeholder^="اسم اللاعب"]');
  for (let index = 0; index < 4; index += 1) await inputs.nth(index).fill(names[index]);
  await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await expect(page.getByText('المملكة 1 من 4')).toBeVisible();
  await page.getByText('لطش / كومبلكس', { exact: true }).click(); const scoreInputs = page.locator('input[type="number"]');
  for (const [index, value] of [-200, -150, -100, -25].entries()) await scoreInputs.nth(index).fill(String(value));
  await expect(page.getByText(/المجموع الحالي -475/)).toBeVisible(); await expect(page.getByRole('button', { name: 'حفظ اللطش' })).toBeDisabled();
  await scoreInputs.nth(3).fill('-50'); await page.getByRole('button', { name: 'أحمد', exact: true }).last().click(); await page.getByRole('button', { name: 'مو مدبل' }).click(); await page.getByRole('button', { name: 'حفظ اللطش' }).click();
  const dismiss = page.getByRole('button', { name: 'إغلاق' }); if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
  await page.getByText('تركس', { exact: true }).last().click(); for (const name of names) await page.getByRole('button', { name: new RegExp(name) }).last().click(); await page.getByRole('button', { name: 'حفظ ترتيب التركس' }).click(); await expect(page.getByText('المملكة 2 من 4')).toBeVisible();
  await page.reload(); await expect(page.getByText('المملكة 2 من 4')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('CC solo setup and configurable Tarneeb remain distinct', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 }); await page.goto(base); await dismissOnboarding(page);
  await page.getByText('CC', { exact: true }).first().click(); await page.getByRole('button', { name: 'يهودية' }).click(); const ccInputs = page.locator('input[placeholder^="اسم اللاعب"]'); for (let i = 0; i < 4; i += 1) await ccInputs.nth(i).fill(`لاعب ${i + 1}`); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await expect(page.getByText('لطش 1')).toBeVisible();
  await page.goto(`${base}#/new/tarneeb-61`); const inputs = page.locator('input[placeholder^="اسم اللاعب"]'); for (let i = 0; i < 4; i += 1) await inputs.nth(i).fill(`طرنيب ${i + 1}`); await page.getByRole('button', { name: '51', exact: true }).click(); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await expect(page.getByRole('heading', { name: 'طرنيب — الهدف 51' })).toBeVisible();
  await page.goto(`${base}#/new/tarneeb-41`); await expect(page.getByText('طرنيب سوري 41')).toBeVisible(); await expect(page.getByText('هدف المباراة')).toHaveCount(0);
});

test('player roster and message settings are usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}#/settings`); await dismissOnboarding(page); await page.getByText('إدارة اللاعبين الدائمين').click(); await page.getByRole('button', { name: 'إضافة' }).click(); await page.locator('input').last().fill('لاعب دائم'); await page.getByRole('button', { name: 'حفظ' }).click(); await expect(page.getByText('لاعب دائم')).toBeVisible();
  await page.goto(`${base}#/settings`); await page.getByRole('button', { name: 'الرسائل' }).click(); await expect(page.getByText('تركس سريعة — لطش')).toBeVisible();
});
