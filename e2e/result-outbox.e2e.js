import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';
const names = ['Ahmed', 'Ali', 'Omar', 'Ziad'];
async function dismissOnboarding(page) { const button = page.getByRole('button', { name: 'جاهزين، ابدأ' }); if (await button.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) await button.click(); }
async function addPlayers(page) { for (const name of names) { await page.getByPlaceholder('اسم اللاعب المؤقت').fill(name); await page.getByRole('button', { name: 'إضافة', exact: true }).click(); } }
async function startLikha(page) { await page.goto(`${base}#/new/likha`); await dismissOnboarding(page); await addPlayers(page); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); }

test('فصلت confirms, ignores an unsaved draft, preserves scores and appears in history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await startLikha(page);
  await page.getByRole('button', { name: 'زيادة كوبا Ahmed' }).click();
  await page.getByRole('button', { name: 'فصلت', exact: true }).click();
  await expect(page.getByText('إنهاء البرتية؟')).toBeVisible(); await expect(page.getByText('يوجد تسجيل لم يتم حفظه بعد؟', { exact: false })).toBeVisible();
  await expect(page.getByText('0', { exact: true }).first()).toBeVisible(); await page.getByRole('button', { name: 'إلغاء' }).click();
  await expect(page.getByRole('button', { name: 'زيادة كوبا Ahmed' })).toBeVisible();
  await page.getByRole('button', { name: 'فصلت', exact: true }).click(); await page.getByRole('button', { name: 'فصلت واحفظ' }).click();
  await expect(page.getByText('تعادل حقيقي')).toBeVisible(); await page.goto(`${base}#/history`); await expect(page.getByText('فصلت', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'إرسال ليخة إلى Telegram' }).click(); await expect(page.getByText('أكمل إعداد Telegram أولاً')).toBeVisible(); await page.getByRole('button', { name: 'إغلاق' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('Telegram settings, offline queue persistence and online auto flush work at 390x844', async ({ page, context }) => {
  let telegramOffline = false;
  await page.route('https://api.telegram.org/**', async (route) => {
    if (telegramOffline) { await route.abort('internetdisconnected'); return; }
    const getMe = route.request().url().endsWith('/getMe'); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(getMe ? { ok: true, result: { id: 1, username: 'kok_test_bot', first_name: 'KOK' } } : { ok: true, result: { message_id: 77 } }) });
  });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${base}#/settings`); await dismissOnboarding(page); await page.getByRole('button', { name: 'Telegram', exact: true }).click();
  await page.getByPlaceholder('123456:AA…').fill('123:ABC'); await page.getByPlaceholder('-100… أو رقم المحادثة').fill('42'); await page.getByRole('button', { name: 'حفظ', exact: true }).click(); await page.getByRole('button', { name: 'اختبار الاتصال' }).click(); await expect(page.getByRole('main').getByText('متصل بـ @kok_test_bot')).toBeVisible();
  await page.getByRole('checkbox').first().click(); await expect(page.getByRole('checkbox').first()).toBeChecked();
  await expect.poll(() => page.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open('lammatna-db'); request.onsuccess = () => { const result = request.result.transaction('settings').objectStore('settings').get('main'); result.onsuccess = () => resolve(Boolean(result.result?.telegramAutoSend && result.result?.telegramBotToken && result.result?.telegramChatId)); result.onerror = () => reject(result.error); }; request.onerror = () => reject(request.error); }))).toBe(true);
  await startLikha(page); telegramOffline = true; await context.setOffline(true); await page.getByRole('button', { name: 'فصلت', exact: true }).click(); await page.getByRole('button', { name: 'فصلت واحفظ' }).click(); await expect(page.getByText(/طابور Telegram|راجع إعدادات Telegram/)).toBeVisible();
  const queued = await page.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open('lammatna-db'); request.onsuccess = () => { const result = request.result.transaction('telegramOutbox').objectStore('telegramOutbox').getAll(); result.onsuccess = () => resolve(result.result); result.onerror = () => reject(result.error); }; request.onerror = () => reject(request.error); }));
  expect(queued).toHaveLength(1); expect(queued[0].status).toBe('failed_retryable');
  telegramOffline = false; await context.setOffline(false); await expect.poll(async () => page.evaluate(() => new Promise((resolve, reject) => { const request = indexedDB.open('lammatna-db'); request.onsuccess = () => { const result = request.result.transaction('telegramOutbox').objectStore('telegramOutbox').getAll(); result.onsuccess = () => resolve(result.result[0]?.status); result.onerror = () => reject(result.error); }; request.onerror = () => reject(request.error); })), { timeout: 15000 }).toBe('sent');
  await page.goto(`${base}#/settings`); await page.getByRole('button', { name: 'Telegram', exact: true }).click(); await expect(page.getByText('1', { exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
