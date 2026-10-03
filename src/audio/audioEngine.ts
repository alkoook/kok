import type { AppSettings } from '../types';
import { db } from '../db/database';
import { DEFAULT_EVENT_SOUNDS, factorySoundById } from './soundRegistry';
import { cancelSpeech, speakMessage } from './speech';
import type { AudioChannel, AudioEvent, AudioPlaybackMode, FactorySoundAsset, ReactionAudioOptions, UploadedAudioAsset } from './types';

type PlayableNode = { stop: (when?: number) => void };
type AudioContextConstructor = new () => AudioContext;

export function effectiveEffectsVolume(settings: Pick<AppSettings, 'soundEnabled' | 'effectsEnabled' | 'masterVolume' | 'effectsVolume'>, force = false): number {
  if ((!settings.soundEnabled || !settings.effectsEnabled) && !force) return 0;
  return Math.min(1, Math.max(0, (settings.masterVolume ?? 80) / 100 * (settings.effectsVolume ?? 75) / 100));
}

const channelForEvent = (event: AudioEvent): AudioChannel => event === 'ui-tap' || event === 'round-saved' ? 'ui' : event === 'match-complete' || event === 'victory' || event === 'second-kaboot' ? 'victory' : 'reaction';

export class AudioEngine {
  private context?: AudioContext;
  private unlocked = false;
  private decoded = new Map<string, AudioBuffer>();
  private active = new Map<AudioChannel, PlayableNode[]>();

  isUnlocked(): boolean { return this.unlocked; }
  async unlock(): Promise<boolean> { if (this.unlocked) return true; const Constructor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext); if (!Constructor) return false; try { this.context ??= new Constructor(); await this.context.resume(); this.unlocked = this.context.state === 'running'; return this.unlocked; } catch { return false; } }
  stopChannel(channel: AudioChannel): void { for (const node of this.active.get(channel) ?? []) { try { node.stop(); } catch { /* already stopped */ } } this.active.delete(channel); }
  stopReactionAudio(): void { this.stopChannel('reaction'); this.stopChannel('victory'); cancelSpeech(); }
  stopAll(): void { for (const channel of ['ui', 'reaction', 'voice', 'victory'] as const) this.stopChannel(channel); cancelSpeech(); }
  invalidateAsset(id: string): void { this.decoded.delete(id); }
  async playEvent(event: AudioEvent, force = false): Promise<boolean> { const settings = await db.settings.get('main'); if (!settings) return false; const mapping = await db.audioEventMappings.get(event); const requestedId = mapping?.assetId ?? DEFAULT_EVENT_SOUNDS[event]; const played = await this.playAsset(requestedId, channelForEvent(event), settings, force); if (!played && mapping?.assetId) return this.playAsset(DEFAULT_EVENT_SOUNDS[event], channelForEvent(event), settings, force); return played; }
  async previewAsset(assetId: string): Promise<boolean> { const settings = await db.settings.get('main'); return settings ? this.playAsset(assetId, 'reaction', settings, true) : false; }
  async playReaction(options: ReactionAudioOptions): Promise<{ sound: boolean; speech: boolean }> { const settings = await db.settings.get('main'); if (!settings || settings.soundEnabled === false) return { sound: false, speech: false }; const mode: AudioPlaybackMode | undefined = options.mode; if (mode === 'none') return { sound: false, speech: false }; const wantsSpeech = mode === 'speech' || mode === 'sound-and-speech' || mode === undefined && settings.messageVoiceEnabled === true; const wantsSound = mode === 'event-default' || mode === 'custom-sound' || mode === 'sound-and-speech' || mode === undefined; let sound = false; if (wantsSound) sound = options.assetId && (mode === 'custom-sound' || mode === 'sound-and-speech') ? await this.playAsset(options.assetId, channelForEvent(options.event), settings) : await this.playEvent(options.event); const speech = Boolean(wantsSpeech && options.message && speakMessage(options.message, settings, true)); return { sound, speech }; }
  private async playAsset(id: string, channel: AudioChannel, settings: AppSettings, force = false): Promise<boolean> { const volume = effectiveEffectsVolume(settings, force); if (volume <= 0) return false; window.dispatchEvent(new CustomEvent('kok:audio-request', { detail: { assetId: id, channel } })); if (!this.unlocked || !this.context) return false; if (channel === 'victory') { this.stopChannel('reaction'); cancelSpeech(); } this.stopChannel(channel); const factory = factorySoundById(id); if (factory) return this.playFactory(factory, channel, volume); const uploaded = await db.audioAssets.get(id); return uploaded ? this.playUploaded(uploaded, channel, volume) : false; }
  private playFactory(sound: FactorySoundAsset, channel: AudioChannel, volume: number): boolean { if (!this.context) return false; const gain = this.context.createGain(); gain.gain.setValueAtTime(Math.min(0.22, volume * 0.22), this.context.currentTime); gain.connect(this.context.destination); const slice = sound.durationMs / sound.frequencies.length / 1000; const nodes: OscillatorNode[] = []; sound.frequencies.forEach((frequency, index) => { const oscillator = this.context!.createOscillator(); oscillator.type = sound.wave; oscillator.frequency.value = frequency; oscillator.connect(gain); oscillator.start(this.context!.currentTime + slice * index); oscillator.stop(this.context!.currentTime + slice * (index + 1)); nodes.push(oscillator); }); this.active.set(channel, nodes); return true; }
  private async playUploaded(asset: UploadedAudioAsset, channel: AudioChannel, volume: number): Promise<boolean> { if (!this.context) return false; try { let buffer = this.decoded.get(asset.id); if (!buffer) { buffer = await this.context.decodeAudioData(await asset.blob.arrayBuffer()); this.decoded.set(asset.id, buffer); } const source = this.context.createBufferSource(); const gain = this.context.createGain(); source.buffer = buffer; gain.gain.value = volume; source.connect(gain); gain.connect(this.context.destination); source.start(); this.active.set(channel, [source]); return true; } catch { return false; } }
}

export const audioEngine = new AudioEngine();
