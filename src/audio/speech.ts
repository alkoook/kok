import type { AppSettings } from '../types';

export function normalizeSpeechText(text: string): string {
  return text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
    .replace(/([أإآاوي])\1{3,}/gu, '$1$1')
    .replace(/([!?؟.،])\1+/g, '$1')
    .replace(/[ـ*_#~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function selectSpeechVoice(voices: SpeechSynthesisVoice[], settings: Pick<AppSettings, 'speechVoiceURI' | 'speechVoiceName' | 'speechVoiceLang'>): SpeechSynthesisVoice | undefined {
  const saved = voices.find((voice) => voice.voiceURI === settings.speechVoiceURI) ?? voices.find((voice) => voice.name === settings.speechVoiceName && voice.lang === settings.speechVoiceLang);
  return saved ?? voices.find((voice) => /^ar(?:-|$)/i.test(voice.lang)) ?? voices.find((voice) => voice.default) ?? voices[0];
}

export function availableSpeechVoices(): SpeechSynthesisVoice[] {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speakMessage(text: string, settings: Pick<AppSettings, 'masterVolume' | 'voiceVolume' | 'speechRate' | 'speechPitch' | 'speechVoiceURI' | 'speechVoiceName' | 'speechVoiceLang'>, replace = true): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  const cleaned = normalizeSpeechText(text); if (!cleaned) return false;
  if (replace) window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  const voice = selectSpeechVoice(window.speechSynthesis.getVoices(), settings); if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? settings.speechVoiceLang ?? 'ar';
  utterance.rate = Math.min(1.4, Math.max(0.7, settings.speechRate ?? 1));
  utterance.pitch = Math.min(1.5, Math.max(0.5, settings.speechPitch ?? 1));
  utterance.volume = Math.min(1, Math.max(0, (settings.masterVolume ?? 80) / 100 * (settings.voiceVolume ?? 90) / 100));
  window.dispatchEvent(new CustomEvent('kok:speech-request', { detail: { text: cleaned, voice: voice?.voiceURI, rate: utterance.rate, pitch: utterance.pitch, volume: utterance.volume } }));
  window.speechSynthesis.speak(utterance); return true;
}

export function subscribeToSpeechVoices(listener: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => undefined;
  const synthesis = window.speechSynthesis; const update = () => listener(synthesis.getVoices()); update();
  if (typeof synthesis.addEventListener === 'function') { synthesis.addEventListener('voiceschanged', update); return () => synthesis.removeEventListener('voiceschanged', update); }
  const previous = synthesis.onvoiceschanged; synthesis.onvoiceschanged = update; return () => { synthesis.onvoiceschanged = previous; };
}
