import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';
const names = ['Ahmed', 'Ali', 'Omar', 'Ziad'];

async function dismissOnboarding(page) {
  const button = page.getByRole('button', { name: 'جاهزين، ابدأ' });
  if (await button.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)) await button.click();
}

async function open(page, hash = '') { await page.goto(`${base}${hash}`); await dismissOnboarding(page); }
async function addTemporaryPlayers(page, playerNames = names) { for (const name of playerNames) { await page.getByPlaceholder('اسم اللاعب المؤقت').fill(name); await page.getByRole('button', { name: 'إضافة', exact: true }).click(); } }
async function dismissMessage(page) { const close = page.getByRole('button', { name: 'إغلاق رسالة القعدة' }); if (await close.isVisible().catch(() => false)) await close.click({ timeout: 1000 }).catch(() => {}); }
async function fillTeamLash(page, first = -180, second = -320, eater = names[0], doubled = false) { const inputs = page.getByTestId('team-lash-input'); await expect(inputs).toHaveCount(2); await inputs.nth(0).fill(String(first)); await inputs.nth(1).fill(String(second)); await page.getByRole('button', { name: eater, exact: true }).click(); await page.getByRole('button', { name: doubled ? 'مدبل' : 'مو مدبل', exact: true }).click(); await page.getByRole('button', { name: 'حفظ اللطش' }).click(); await dismissMessage(page); }
async function playTrixRanking(page) { await page.getByText('تركس', { exact: true }).last().click(); for (const name of names) await page.getByRole('button', { name: new RegExp(`^${name}`) }).last().click(); await page.getByRole('button', { name: 'حفظ ترتيب التركس' }).click(); await dismissMessage(page); }
async function databaseCount(page, store) { return page.evaluate((storeName) => new Promise((resolve, reject) => { const request = indexedDB.open('lammatna-db'); request.onerror = () => reject(request.error); request.onsuccess = () => { const db = request.result; const count = db.transaction(storeName).objectStore(storeName).count(); count.onerror = () => reject(count.error); count.onsuccess = () => resolve(count.result); }; }), store); }

for (const width of [360, 390, 412, 1280]) {
  test(`home RTL responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 844 }); await open(page);
    await expect(page.getByRole('heading', { name: 'لعبة جديدة' })).toBeVisible(); await expect(page.getByText('CC', { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('permanent roster, real avatar, seat assignment, teams, and temporary isolation', async ({ page }) => {
  test.setTimeout(60000); await page.setViewportSize({ width: 390, height: 844 }); await open(page, '#/players');
  for (const [index, name] of names.entries()) {
    await page.getByRole('button', { name: 'إضافة', exact: true }).click();
    if (index === 0) await page.locator('input[type="file"]').setInputFiles('public/pwa-192.png');
    await page.getByLabel('الاسم').fill(name); await page.getByRole('button', { name: 'حفظ', exact: true }).click(); await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await expect(page.locator('article img')).toHaveCount(1); await page.reload(); await expect(page.locator('article img')).toHaveCount(1);
  const photo = await page.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open('lammatna-db'); request.onsuccess = () => { const result = request.result.transaction('players').objectStore('players').getAll(); result.onsuccess = () => { const player = result.result.find((item) => item.name === 'Ahmed'); resolve({ type: player.photo.type, size: player.photo.size }); }; result.onerror = () => reject(result.error); }; request.onerror = () => reject(request.error); }));
  expect(photo.type).toBe('image/webp'); expect(photo.size).toBeGreaterThan(0);
  await page.goto(`${base}#/new/trix-fast`);
  for (const name of names) await page.getByRole('button', { name: `اختيار اللاعب ${name}`, exact: true }).click();
  for (let index = 1; index <= 4; index += 1) await expect(page.getByTestId(`seat-${index}`)).toContainText(names[index - 1]);
  await expect(page.getByText('Ahmed + Omar', { exact: true })).toBeVisible(); await expect(page.getByText('Ali + Ziad', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await expect(page.getByTestId('team-score-1')).toContainText('Ahmed + Omar'); await expect(page.getByTestId('team-score-1').locator('img')).toHaveCount(1);
  await page.goto(`${base}#/new/cc`); await addTemporaryPlayers(page, ['Temp 1', 'Temp 2', 'Temp 3', 'Temp 4']); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await expect(page.getByText('المملكة 1 من 4')).toBeVisible(); expect(await databaseCount(page, 'players')).toBe(4);
});

test('partnership Lash stores two team values, supports stepper, edit, history and undo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page, '#/new/trix-fast'); await addTemporaryPlayers(page); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  await page.getByText('لطش / كومبلكس', { exact: true }).click(); const inputs = page.getByTestId('team-lash-input'); await inputs.nth(0).fill('-200'); await page.getByRole('button', { name: /زائد 5/ }).first().click(); await page.getByRole('button', { name: /زائد 5/ }).first().click(); await expect(inputs.nth(0)).toHaveValue('-190'); await page.getByRole('button', { name: /ناقص 5/ }).first().click(); await expect(inputs.nth(0)).toHaveValue('-195'); await inputs.nth(0).fill('-180'); await inputs.nth(1).fill('-320'); await expect(page.getByTestId('lash-total')).toContainText('-500'); await page.getByRole('button', { name: 'Ahmed', exact: true }).click(); await page.getByRole('button', { name: 'مو مدبل' }).click(); await page.getByRole('button', { name: 'حفظ اللطش' }).click(); await dismissMessage(page);
  await expect(page.getByTestId('team-score-1')).toContainText('-180'); await expect(page.getByTestId('team-score-2')).toContainText('-320');
  const gameId = page.url().split('/').at(-1); await page.goto(`${base}#/details/${gameId}`); await expect(page.getByText('Ahmed وOmar: -180')).toBeVisible(); await expect(page.getByText('Ali وZiad: -320')).toBeVisible(); await expect(page.getByText('المجموع: -500')).toBeVisible(); await page.goBack();
  await page.getByRole('button', { name: /المملكة 1 · لطش/ }).click(); const edited = page.getByTestId('team-lash-input'); await edited.nth(0).fill('-200'); await edited.nth(1).fill('-300'); await page.getByRole('button', { name: 'حفظ اللطش' }).click(); await expect(page.getByTestId('team-score-1')).toContainText('-200'); await expect(page.getByTestId('team-score-2')).toContainText('-300');
  await page.getByRole('button', { name: 'تراجع', exact: true }).click(); await page.getByRole('button', { name: 'تراجع', exact: true }).last().click(); await expect(page.getByTestId('team-score-1')).toContainText('0'); await expect(page.getByRole('button', { name: /المملكة 1 · لطش/ })).toHaveCount(0);
});

test('solo Lash has four fields and +5/-5/manual input; Tarneeb targets remain separate', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 }); await open(page, '#/new/cc'); await page.getByRole('button', { name: 'يهودية' }).click(); await addTemporaryPlayers(page); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await page.getByText('لطش 1', { exact: true }).click(); const inputs = page.getByTestId('player-lash-input'); await expect(inputs).toHaveCount(4); await inputs.nth(0).fill('-200'); await page.getByRole('button', { name: /زائد 5/ }).first().click(); await page.getByRole('button', { name: /زائد 5/ }).first().click(); await page.getByRole('button', { name: /ناقص 5/ }).first().click(); await expect(inputs.nth(0)).toHaveValue('-195'); await inputs.nth(0).fill('-250'); await expect(inputs.nth(0)).toHaveValue('-250');
  await page.goto(`${base}#/new/tarneeb-61`); await addTemporaryPlayers(page); await page.getByRole('button', { name: '51', exact: true }).click(); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await expect(page.getByRole('heading', { name: 'طرنيب — الهدف 51' })).toBeVisible();
  await page.goto(`${base}#/new/tarneeb-41`); await expect(page.getByText('هدف المباراة')).toHaveCount(0);
});

test('complete Fast Trix partnership reaches rich summary and offline share card', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 390, height: 844 }); await open(page, '#/players'); await page.getByRole('button', { name: 'إضافة', exact: true }).click(); await page.locator('input[type="file"]').setInputFiles('public/pwa-192.png'); await page.getByLabel('الاسم').fill('Ahmed'); await page.getByRole('button', { name: 'حفظ', exact: true }).click(); await expect(page.getByText('Ahmed', { exact: true })).toBeVisible(); await page.goto(`${base}#/new/trix-fast`); await page.getByRole('button', { name: 'اختيار اللاعب Ahmed' }).click(); await addTemporaryPlayers(page, ['Ali', 'Omar', 'Ziad']); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  for (let kingdom = 0; kingdom < 4; kingdom += 1) { await page.getByText('لطش / كومبلكس', { exact: true }).click(); await fillTeamLash(page, -180, -320, names[kingdom], kingdom === 2); await playTrixRanking(page); if (kingdom < 3) await expect(page.getByText(`المملكة ${kingdom + 2} من 4`)).toBeVisible(); }
  await expect(page.getByText('ملخص القعدة والألقاب')).toBeVisible(); await page.getByText('ملخص القعدة والألقاب').click(); await expect(page.getByRole('heading', { name: 'حكاية القعدة' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'نجوم القعدة' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'مسخرة القعدة' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'الألقاب الرسمية لليلة' })).toBeVisible(); await expect(page.getByText('المملكة 4 · Ziad')).toBeVisible(); await expect(page.locator('section.match-finish img')).toHaveCount(1); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'مشاركة بطاقة القعدة' }).click(); expect((await download).suggestedFilename()).toContain('trix-fast');
});

test('complete CC partnership validates -500/-1000/-4000 and summary', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 412, height: 915 }); await open(page, '#/new/cc'); await addTemporaryPlayers(page); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  for (let round = 0; round < 8; round += 1) { await page.getByText(`لطش ${(round % 2) + 1}`, { exact: true }).click(); await fillTeamLash(page, -180, -320, names[Math.floor(round / 2)], round === 5); }
  await expect(page.getByText('ملخص القعدة والألقاب')).toBeVisible(); const scores = await page.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open('lammatna-db'); request.onsuccess = () => { const result = request.result.transaction('games').objectStore('games').getAll(); result.onsuccess = () => resolve(result.result.find((game) => game.gameType === 'cc').scores); result.onerror = () => reject(result.error); }; request.onerror = () => reject(request.error); })); expect(scores).toEqual(expect.objectContaining({})); expect(Object.values(scores).reduce((sum, value) => sum + value, 0)).toBe(-4000);
  await page.getByText('ملخص القعدة والألقاب').click(); await expect(page.getByRole('heading', { name: 'الممالك الأربع' })).toBeVisible(); await expect(page.getByText(/لطش 2/).first()).toBeVisible(); const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'مشاركة بطاقة القعدة' }).click(); expect((await download).suggestedFilename()).toContain('cc');
});

test('dark mode covers setup, player picker, Lash and message settings without overflow', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 360, height: 800 }); await open(page, '#/settings'); await page.getByRole('button', { name: 'داكن' }).click(); await expect(page.locator('html')).toHaveClass(/dark/); await page.goto(`${base}#/new/trix-fast`); await addTemporaryPlayers(page); await expect(page.locator('html')).toHaveClass(/dark/); await page.getByRole('button', { name: 'ابدأ المباراة' }).click();
  await page.getByText('لطش / كومبلكس', { exact: true }).click(); const inputs = page.getByTestId('team-lash-input'); await expect(inputs).toHaveCount(2); await inputs.nth(0).fill('-180'); await inputs.nth(1).fill('-320'); await page.getByRole('button', { name: 'Ahmed', exact: true }).click(); await page.getByRole('button', { name: 'مو مدبل' }).click(); await page.getByRole('button', { name: 'حفظ اللطش' }).click(); await expect(page.getByRole('status')).toBeVisible(); await expect(page.locator('html')).toHaveClass(/dark/); await dismissMessage(page); await playTrixRanking(page);
  for (let kingdom = 1; kingdom < 4; kingdom += 1) { await page.getByText('لطش / كومبلكس', { exact: true }).click(); await fillTeamLash(page, -180, -320, names[kingdom]); await playTrixRanking(page); }
  await page.getByText('ملخص القعدة والألقاب').click(); await expect(page.getByRole('button', { name: 'مشاركة بطاقة القعدة' })).toBeVisible(); await expect(page.locator('html')).toHaveClass(/dark/); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.goto(`${base}#/settings`); await page.getByRole('button', { name: 'الرسائل' }).click(); await expect(page.getByRole('heading', { name: 'رسائل اللعبة' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'ملخصات القعدة والألقاب' })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
