import { expect, test } from '@playwright/test';

const base = 'http://127.0.0.1:4173/';
async function open(page, hash = '') { await page.goto(base + hash); const button = page.getByRole('button', { name: 'جاهزين، ابدأ' }); if (await button.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) await button.click(); }
async function addPlayers(page, names = ['Ahmed', 'Ali', 'Omar', 'Ziad']) { for (const name of names) { await page.getByPlaceholder('اسم اللاعب المؤقت').fill(name); await page.getByRole('button', { name: 'إضافة', exact: true }).click(); } }
function wavBuffer() {
  const samples = 800; const buffer = Buffer.alloc(44 + samples * 2); buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40); return buffer;
}
async function installAudioMocks(page) {
  await page.addInitScript(() => {
    window.__audioRequests = []; window.__speechRequests = [];
    window.addEventListener('kok:audio-request', (event) => window.__audioRequests.push(event.detail));
    window.addEventListener('kok:speech-request', (event) => window.__speechRequests.push(event.detail));
    class FakeContext {
      state = 'running'; currentTime = 0; destination = {};
      async resume() { this.state = 'running'; }
      createGain() { return { gain: { value: 1, setValueAtTime() {} }, connect() {} }; }
      createOscillator() { return { type: 'sine', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }; }
      async decodeAudioData() { return {}; }
      createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {} }; }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeContext });
    class FakeUtterance { constructor(text) { this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; } }
    const arabic = { voiceURI: 'ar-test', name: 'Arabic Test', lang: 'ar-SY', default: true, localService: true };
    const listeners = new Set();
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [arabic], speak: (utterance) => { window.__lastUtterance = utterance; }, cancel: () => { window.__speechCancels = (window.__speechCancels ?? 0) + 1; }, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener) } });
  });
}

test('audio settings persist volumes, TTS voice, and previews through the visible UI', async ({ page }) => {
  await installAudioMocks(page); await page.setViewportSize({ width: 360, height: 800 }); await open(page, '#/settings'); await page.getByRole('button', { name: 'الصوت', exact: true }).click();
  const sound = page.getByRole('checkbox', { name: 'الصوت', exact: true }); await sound.click(); await expect(sound).not.toBeChecked(); await sound.click(); await expect(sound).toBeChecked();
  await page.getByLabel('مستوى المؤثرات', { exact: true }).fill('42'); const tts = page.getByRole('checkbox', { name: 'قراءة الرسائل صوتيًا', exact: true }); await tts.click(); await expect(tts).toBeChecked();
  await page.getByLabel('الصوت العربي').selectOption('ar-test'); await page.getByLabel(/^سرعة القراءة/).fill('120'); await page.getByLabel(/^حدة الصوت/).fill('80');
  await page.getByRole('button', { name: 'معاينة نجاح', exact: true }).click(); await page.getByRole('button', { name: 'تجربة الصوت' }).click();
  expect(await page.evaluate(() => window.__audioRequests.some((item) => item.assetId === 'factory-success'))).toBe(true);
  expect(await page.evaluate(() => window.__speechRequests.some((item) => item.text.includes('الصوت جاهز')))).toBe(true);
  await page.reload(); await page.getByRole('button', { name: 'الصوت', exact: true }).click();
  await expect(page.getByLabel('مستوى المؤثرات', { exact: true })).toHaveValue('42'); await expect(page.getByRole('checkbox', { name: 'قراءة الرسائل صوتيًا', exact: true })).toBeChecked(); await expect(page.getByLabel('الصوت العربي')).toHaveValue('ar-test');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 412, height: 915 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('uploaded sound and speech belong to the exclusive conditional reaction and survive offline', async ({ page, context }) => {
  test.setTimeout(90000); await installAudioMocks(page); await page.setViewportSize({ width: 390, height: 844 }); await open(page, '#/settings'); await page.getByRole('button', { name: 'الصوت', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'test-tone.wav', mimeType: 'audio/wav', buffer: wavBuffer() }); await expect(page.getByRole('strong').filter({ hasText: /^test-tone$/ })).toBeVisible();
  await page.getByRole('button', { name: 'معاينة test-tone', exact: true }).click(); await page.waitForFunction(() => window.__audioRequests.length > 0); const uploadedId = await page.evaluate(() => window.__audioRequests.at(-1).assetId);
  await page.getByRole('button', { name: 'الرسائل', exact: true }).click(); await page.getByRole('button', { name: 'إضافة رسالة مشروطة' }).click();
  await page.getByLabel('اسم القاعدة').fill('صوت شرطي'); await page.getByRole('button', { name: 'إضافة شرط' }).click(); await page.getByLabel('حقل الشرط 1').selectOption({ label: 'نتيجة فريق صاحب المملكة' }); await page.getByLabel('معامل الشرط 1').selectOption({ label: 'أقل أو يساوي' }); await page.getByLabel('قيمة الشرط 1').fill('-300');
  await page.getByLabel('نص الرسالة 1').fill('صوت خاص {owner} {score}'); await page.getByRole('checkbox', { name: 'حصرية', exact: true }).check(); await page.getByLabel('صوت القاعدة').selectOption('sound-and-speech'); await page.getByLabel('ملف صوت القاعدة').selectOption({ label: 'test-tone' }); await page.getByRole('button', { name: 'حفظ القاعدة' }).click();
  await page.evaluate(() => { window.__audioRequests = []; window.__speechRequests = []; });
  await page.goto(base + '#/new/trix-fast'); await addPlayers(page); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await expect(page.getByText('لطش / كومبلكس', { exact: true })).toBeVisible();
  await context.setOffline(true); await page.getByText('لطش / كومبلكس', { exact: true }).click(); await page.getByTestId('team-lash-input').fill('-350'); await page.getByRole('button', { name: 'Ahmed', exact: true }).click(); await page.getByRole('button', { name: 'مو مدبل', exact: true }).click(); await page.getByRole('button', { name: 'حفظ اللطش' }).click();
  await expect(page.locator('aside[data-message-source="custom"] p')).toHaveText('صوت خاص Ahmed -350');
  expect(await page.evaluate((id) => window.__audioRequests.some((item) => item.assetId === id), uploadedId)).toBe(true);
  expect(await page.evaluate(() => window.__audioRequests.some((item) => item.assetId === 'factory-heavy-failure'))).toBe(false);
  expect(await page.evaluate(() => window.__speechRequests.some((item) => item.text === 'صوت خاص Ahmed -350'))).toBe(true);
  await context.setOffline(false); await page.goto(base + '#/settings'); await page.getByRole('button', { name: 'الصوت', exact: true }).click(); page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'حذف test-tone', exact: true }).click(); await expect(page.getByText('test-tone', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'الرسائل', exact: true }).click(); await page.getByRole('button', { name: 'تعديل', exact: true }).click(); await expect(page.getByText('الصوت المحدد غير موجود', { exact: true })).toBeVisible();
  await page.goto(base + '#/new/trix-fast'); await addPlayers(page, ['Samer', 'Nader', 'Rami', 'Fadi']); await page.getByRole('button', { name: 'ابدأ المباراة' }).click(); await page.getByText('لطش / كومبلكس', { exact: true }).click(); await page.getByTestId('team-lash-input').fill('-350'); await page.getByRole('button', { name: 'Samer', exact: true }).click(); await page.getByRole('button', { name: 'مو مدبل', exact: true }).click(); await page.getByRole('button', { name: 'حفظ اللطش' }).click(); await expect(page.locator('aside[data-message-source="custom"] p')).toHaveText('صوت خاص Samer -350');
});
