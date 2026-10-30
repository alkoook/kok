import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, initializeDatabase } from '../db/database';
import { AudioEngine, effectiveEffectsVolume } from './audioEngine';
import { DEFAULT_EVENT_SOUNDS } from './soundRegistry';
import { normalizeSpeechText, selectSpeechVoice, speakMessage } from './speech';
import { deleteUploadedAudio, renameUploadedAudio, saveUploadedAudio, totalUploadedAudioSize, validateAudioFile } from './storage';

class FakeUtterance {
  voice?: SpeechSynthesisVoice; lang = ''; rate = 1; pitch = 1; volume = 1;
  constructor(public text: string) {}
}
class FakeAudioContext {
  state: AudioContextState = 'running'; currentTime = 0; destination = {} as AudioDestinationNode;
  async resume() { return undefined; }
  createGain() { return { gain: { value: 1, setValueAtTime: vi.fn() }, connect: vi.fn() } as unknown as GainNode; }
  createOscillator() { return { type: 'sine', frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } as unknown as OscillatorNode; }
  async decodeAudioData() { return {} as AudioBuffer; }
  createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn() } as unknown as AudioBufferSourceNode; }
}

const voice = (name: string, lang: string, voiceURI = name, isDefault = false) => ({ name, lang, voiceURI, default: isDefault, localService: true } as SpeechSynthesisVoice);

describe('الصوت المحلي', () => {
  beforeEach(async () => { await db.delete(); await db.open(); await initializeDatabase(); });
  afterEach(async () => { db.close(); vi.restoreAllMocks(); });

  it('يحسب مستوى المؤثرات ويحترم الكتم العام وكتم المؤثرات', () => {
    expect(effectiveEffectsVolume({ soundEnabled: true, effectsEnabled: true, masterVolume: 80, effectsVolume: 50 })).toBe(0.4);
    expect(effectiveEffectsVolume({ soundEnabled: false, effectsEnabled: true, masterVolume: 80, effectsVolume: 50 })).toBe(0);
    expect(effectiveEffectsVolume({ soundEnabled: true, effectsEnabled: false, masterVolume: 80, effectsVolume: 50 })).toBe(0);
  });

  it('يحفظ Blob ويستعيده ويعيد تسميته ويحذفه ويحسب المساحة', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'test.wav', { type: 'audio/wav' });
    const saved = await saveUploadedAudio(file, async () => 1200);
    expect(await db.audioAssets.get(saved.id)).toMatchObject({ name: 'test', mimeType: 'audio/wav', size: 4, durationMs: 1200 });
    expect(await totalUploadedAudioSize()).toBe(4);
    await renameUploadedAudio(saved.id, 'صوت خاص'); expect((await db.audioAssets.get(saved.id))?.name).toBe('صوت خاص');
    await deleteUploadedAudio(saved.id); expect(await db.audioAssets.get(saved.id)).toBeUndefined();
  });

  it('يرفض ملفاً غير صوتي أو أكبر من 10MB', () => {
    expect(validateAudioFile(new File(['x'], 'bad.txt', { type: 'text/plain' }))).toContain('ملفًا صوتيًا');
    expect(validateAudioFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'huge.wav', { type: 'audio/wav' }))).toContain('10 MB');
  });

  it('يربط الحدث بصوت مخصص ويحذف الربط عند حذف الأصل', async () => {
    const file = new File([new Uint8Array([1])], 'event.wav', { type: 'audio/wav' }); const saved = await saveUploadedAudio(file, async () => 1);
    await db.audioEventMappings.put({ event: 'kaboot', assetId: saved.id, updatedAt: '' }); await deleteUploadedAudio(saved.id);
    expect(await db.audioEventMappings.get('kaboot')).toBeUndefined(); expect(DEFAULT_EVENT_SOUNDS.kaboot).toBe('factory-kaboot');
    expect(DEFAULT_EVENT_SOUNDS['old-man-repeat']).toBe('factory-old-man-repeat');
  });

  it('يعالج أوضاع لا صوت وصوت افتراضي ومرجع محذوف بأمان', async () => {
    const fakeWindow = new EventTarget() as Window & typeof globalThis; Object.assign(fakeWindow, { AudioContext: undefined });
    vi.stubGlobal('window', fakeWindow); const engine = new AudioEngine();
    expect(await engine.playReaction({ event: 'lash-bad', message: 'رسالة', mode: 'none' })).toEqual({ sound: false, speech: false });
    expect(await engine.playReaction({ event: 'lash-bad', message: 'رسالة', mode: 'custom-sound', assetId: 'missing' })).toEqual({ sound: false, speech: false });
  });
  it('يفصل sound-only وspeech-only وsound-and-speech ويستخدم صوت الحدث الافتراضي', async () => {
    const cancel = vi.fn(); const speak = vi.fn(); const requests: Array<{ assetId: string }> = [];
    const fakeWindow = new EventTarget() as Window & typeof globalThis; Object.assign(fakeWindow, { AudioContext: FakeAudioContext, speechSynthesis: { getVoices: () => [voice('Arabic', 'ar-SY', 'ar')], cancel, speak } }); fakeWindow.addEventListener('kok:audio-request', (event) => requests.push((event as CustomEvent).detail));
    vi.stubGlobal('window', fakeWindow); vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    const engine = new AudioEngine(); expect(await engine.unlock()).toBe(true);
    expect(await engine.playReaction({ event: 'contract-success', message: 'نجح', mode: 'event-default' })).toEqual({ sound: true, speech: false });
    expect(requests.at(-1)?.assetId).toBe('factory-success');
    expect(await engine.playReaction({ event: 'contract-success', message: 'نجح', mode: 'speech' })).toEqual({ sound: false, speech: true });
    const file = new File([new Uint8Array([1, 2])], 'both.wav', { type: 'audio/wav' }); const saved = await saveUploadedAudio(file, async () => 10);
    expect(await engine.playReaction({ event: 'lash-disaster', message: 'مصيبة', mode: 'sound-and-speech', assetId: saved.id })).toEqual({ sound: true, speech: true });
    expect(requests.at(-1)?.assetId).toBe(saved.id); expect(speak).toHaveBeenCalledTimes(2);
  });
  it('الكتم العام يمنع الصوت والقراءة معاً', async () => {
    await db.settings.update('main', { soundEnabled: false, messageVoiceEnabled: true });
    const fakeWindow = new EventTarget() as Window & typeof globalThis; Object.assign(fakeWindow, { AudioContext: FakeAudioContext }); vi.stubGlobal('window', fakeWindow);
    expect(await new AudioEngine().playReaction({ event: 'kaboot', message: 'كبوت' })).toEqual({ sound: false, speech: false });
  });
});

describe('القراءة الصوتية', () => {
  it('ينظف الرموز والتطويل التقني من دون تهذيب المحتوى', () => {
    expect(normalizeSpeechText('ممتااااز 😂😂!!!   يا زلمة')).toBe('ممتااز ! يا زلمة');
  });
  it('يفضل الصوت العربي ثم يعود للصوت الافتراضي عند غياب المحفوظ', () => {
    const voices = [voice('English', 'en-US', 'en', true), voice('Arabic', 'ar-SY', 'ar')];
    expect(selectSpeechVoice(voices, { speechVoiceURI: 'missing' })?.voiceURI).toBe('ar');
    expect(selectSpeechVoice(voices, { speechVoiceURI: 'en' })?.voiceURI).toBe('en');
  });
  it('يمرر السرعة والحدة والمستوى ويلغي القراءة السابقة', () => {
    const cancel = vi.fn(); const speak = vi.fn(); const voices = [voice('Arabic', 'ar-SY', 'ar')];
    const fakeWindow = new EventTarget() as Window & typeof globalThis; Object.assign(fakeWindow, { speechSynthesis: { getVoices: () => voices, cancel, speak } });
    vi.stubGlobal('window', fakeWindow); vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    expect(speakMessage('أهلًا!!!', { speechVoiceURI: 'ar', speechRate: 1.2, speechPitch: 0.8, voiceVolume: 40 })).toBe(true);
    expect(cancel).toHaveBeenCalledOnce(); const utterance = speak.mock.calls[0][0] as FakeUtterance;
    expect(utterance).toMatchObject({ text: 'أهلًا!', rate: 1.2, pitch: 0.8, volume: 0.32, lang: 'ar-SY' });
  });
  it('يتراجع بأمان عندما لا تتوفر SpeechSynthesis', () => {
    vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('SpeechSynthesisUtterance', undefined);
    expect(speakMessage('اختبار', {})).toBe(false);
  });
});
