import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';
const names = ['Ahmed', 'Ali', 'Omar', 'Ziad'];

async function dismissOnboarding(page) {
  const button = page.getByRole('button', { name: 'جاهزين، ابدأ' });
  if (await button.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) await button.click();
}

async function start(page, gameType, partnership = false) {
  await page.goto(`${base}#/new/${gameType}`);
  await dismissOnboarding(page);
  if (partnership) await page.getByRole('button', { name: 'شراكة', exact: true }).click();
  for (const name of names) {
    await page.getByPlaceholder('اسم اللاعب المؤقت').fill(name);
    await page.getByRole('button', { name: 'إضافة', exact: true }).click();
  }
  await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
}

for (const viewport of [{ width: 360, height: 740 }, { width: 390, height: 844 }]) {
  test(`فصلت is directly reachable in every primary game at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    for (const scenario of [
      ['tarneeb-61', false],
      ['tarneeb-41', false],
      ['likha', false],
      ['likha', true],
      ['cc', false],
      ['trix-fast', false]
    ]) {
      await start(page, scenario[0], scenario[1]);
      const finish = page.getByRole('button', { name: 'فصلت', exact: true });
      await expect(finish).toBeVisible();
      await finish.click();
      await expect(page.getByText('إنهاء البرتية؟')).toBeVisible();
      await page.getByRole('button', { name: 'إلغاء' }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
}
