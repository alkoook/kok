import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';

async function dismissOnboarding(page) {
  const button = page.getByRole('button', { name: 'جاهزين، ابدأ' });
  if (await button.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)) await button.click();
}

async function open(page, hash = '') { await page.goto(`${base}${hash}`); await dismissOnboarding(page); }
async function addTemporaryPlayers(page, names) { for (const name of names) { await page.getByPlaceholder('اسم اللاعب المؤقت').fill(name); await page.getByRole('button', { name: 'إضافة', exact: true }).click(); } }
async function closeReaction(page) { await page.getByRole('button', { name: 'إغلاق رسالة القعدة' }).click(); }

async function createPermanentPlayer(page, name) {
  await open(page, '#/players'); await page.getByRole('button', { name: 'إضافة', exact: true }).click();
  await page.getByLabel('الاسم').fill(name); await page.getByRole('button', { name: 'حفظ', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function createConditionalRule(page, options) {
  await page.goto(`${base}#/settings`); await page.getByRole('button', { name: 'الرسائل', exact: true }).click();
  await page.getByRole('button', { name: 'إضافة رسالة مشروطة' }).click();
  await page.getByLabel('اسم القاعدة').fill(options.name);
  await page.getByLabel('لعبة القاعدة').selectOption({ label: options.game ?? 'Fast Trix' });
  await page.getByLabel('حدث القاعدة').selectOption({ label: options.event ?? 'لطش' });
  for (const [index, item] of options.conditions.entries()) {
    await page.getByRole('button', { name: 'إضافة شرط' }).click();
    await page.getByLabel(`حقل الشرط ${index + 1}`).selectOption({ label: item.field });
    await page.getByLabel(`معامل الشرط ${index + 1}`).selectOption({ label: item.operator ?? 'يساوي' });
    const value = page.getByLabel(`قيمة الشرط ${index + 1}`);
    if (item.valueLabel) await value.selectOption({ label: item.valueLabel }); else await value.fill(String(item.value));
  }
  await page.getByLabel('نص الرسالة 1').fill(options.message);
  if (options.exclusive) await page.getByRole('checkbox', { name: 'حصرية', exact: true }).check();
  if (options.once) await page.getByRole('checkbox', { name: 'مرة واحدة بالقعدة', exact: true }).check();
  await page.getByRole('button', { name: 'حفظ القاعدة' }).click();
  await expect(page.getByText(options.name, { exact: true })).toBeVisible();
}

async function startFastGame(page, permanentName, temporaryNames) {
  await page.goto(`${base}#/new/trix-fast`);
  if (permanentName) await page.getByRole('button', { name: `اختيار اللاعب ${permanentName}`, exact: true }).click();
  await addTemporaryPlayers(page, temporaryNames); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
}

async function saveFastLash(page, enteredScore, eaterName, doubled = false) {
  await page.getByText('لطش / كومبلكس', { exact: true }).click();
  await page.getByTestId('team-lash-input').fill(String(enteredScore));
  await page.getByRole('button', { name: eaterName, exact: true }).click();
  await page.getByRole('button', { name: doubled ? 'مدبل' : 'مو مدبل', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ اللطش' }).click();
}

async function saveCcLash(page, label, enteredScore, eaterName, doubled = false) {
  await page.getByText(label, { exact: true }).click();
  await page.getByTestId('team-lash-input').fill(String(enteredScore));
  await page.getByRole('button', { name: eaterName, exact: true }).click();
  await page.getByRole('button', { name: doubled ? 'مدبل' : 'مو مدبل', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ اللطش' }).click();
}

test('creates an exclusive Fast rule through the UI and suppresses the Lash factory reaction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  await createConditionalRule(page, { name: 'اختبار اللطش الخاص', exclusive: true, conditions: [{ field: 'طريقة اللعب', valueLabel: 'شراكة' }, { field: 'نتيجة فريق صاحب المملكة', operator: 'أقل أو يساوي', value: -300 }], message: 'اختبار خاص {owner} {score}' });
  await startFastGame(page, undefined, ['Ahmed', 'Ali', 'Omar', 'Ziad']); await saveFastLash(page, -350, 'Ahmed');
  const overlay = page.locator('aside[data-message-source="custom"]');
  await expect(overlay).toBeVisible(); await expect(overlay.locator('p')).toHaveText('اختبار خاص Ahmed -350');
  await expect(page.locator('aside[data-message-source="factory"]')).toHaveCount(0);
  await closeReaction(page); await expect(page.locator('aside[data-message-source="factory"]')).toHaveAttribute('data-message-id', /^old-man-v2-/);
});

test('targets a permanent profile ID and does not fire when that profile is absent', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 390, height: 844 }); await createPermanentPlayer(page, 'Ahmed');
  await createConditionalRule(page, { name: 'اختبار اللاعب الدائم', event: 'الختيار', exclusive: true, conditions: [{ field: 'آكل الختيار الدائم', valueLabel: 'Ahmed' }, { field: 'الختيار مدبل', valueLabel: 'نعم' }], message: 'قاعدة أحمد الدائمة {player}' });
  await startFastGame(page, 'Ahmed', ['Ali', 'Omar', 'Ziad']); await saveFastLash(page, -180, 'Ahmed', true);
  await closeReaction(page); await expect(page.locator('aside[data-message-source="custom"] p')).toHaveText('قاعدة أحمد الدائمة Ahmed');
  await page.goto(`${base}#/new/trix-fast`); await addTemporaryPlayers(page, ['Samer', 'Nader', 'Rami', 'Fadi']); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await saveFastLash(page, -180, 'Samer', true);
  await closeReaction(page); const oldMan = page.locator('aside[data-message-source="factory"]'); await expect(oldMan).toHaveAttribute('data-message-id', /^old-man-v2-/); await expect(oldMan).not.toContainText('قاعدة أحمد الدائمة');
});

test('selects new Old Man normal, doubled, repeat and owner-doubled categories with intensity metadata', async ({ page }) => {
  test.setTimeout(90000); await page.addInitScript(() => { Math.random = () => 0; }); await page.setViewportSize({ width: 390, height: 844 }); await open(page, '#/settings');
  await page.getByText('مستوى المسخرة', { exact: true }).locator('..').locator('select').selectOption('1');
  await page.goto(`${base}#/new/cc`); await addTemporaryPlayers(page, ['Ahmed', 'Ali', 'Omar', 'Ziad']); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  await saveCcLash(page, 'لطش 1', -180, 'Ahmed'); await closeReaction(page);
  await expect(page.locator('aside[data-message-id^="old-man-v2-normal-"]')).toHaveAttribute('data-message-intensity', '1'); await closeReaction(page);
  await saveCcLash(page, 'لطش 2', -180, 'Ali', true); await closeReaction(page);
  await expect(page.locator('aside[data-message-id^="old-man-v2-doubled-"]')).toBeVisible(); await closeReaction(page);
  await saveCcLash(page, 'لطش 1', -180, 'Ahmed'); await closeReaction(page);
  await expect(page.locator('aside[data-message-id^="old-man-v2-repeat-"]')).toBeVisible();

  await page.goto(`${base}#/settings`); await page.getByText('مستوى المسخرة', { exact: true }).locator('..').locator('select').selectOption('4');
  await page.goto(`${base}#/new/cc`); await addTemporaryPlayers(page, ['A', 'B', 'C', 'D']); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  await page.evaluate(() => { Math.random = () => 0.75; }); await saveCcLash(page, 'لطش 1', -180, 'A', true); await closeReaction(page);
  await expect(page.locator('aside[data-message-id^="old-man-v2-owner-doubled-"]')).toBeVisible();
});
