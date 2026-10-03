export type AudioAssetSource = 'factory' | 'uploaded';
export type AudioPlaybackMode = 'none' | 'event-default' | 'custom-sound' | 'speech' | 'sound-and-speech';
export type AudioChannel = 'ui' | 'reaction' | 'voice' | 'victory';

export type AudioEvent =
  | 'ui-tap' | 'round-saved'
  | 'lash-saved' | 'lash-good' | 'lash-bad' | 'lash-disaster'
  | 'trix-first' | 'trix-last'
  | 'old-man' | 'old-man-doubled' | 'old-man-repeat'
  | 'kingdom-complete' | 'match-complete' | 'victory' | 'disaster'
  | 'contract-success' | 'contract-failure' | 'broken-seven' | 'kaboot' | 'second-kaboot'
  | 'success-streak' | 'failure-streak';

export type UploadedAudioAsset = {
  id: string;
  name: string;
  source: 'uploaded';
  mimeType: string;
  blob: Blob;
  size: number;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
};

export type FactorySoundAsset = {
  id: string;
  name: string;
  source: 'factory';
  channel: AudioChannel;
  frequencies: number[];
  durationMs: number;
  wave: OscillatorType;
};

export type AudioEventMapping = { event: AudioEvent; assetId: string; updatedAt: string };

export type ReactionAudioOptions = {
  event: AudioEvent;
  message?: string;
  mode?: AudioPlaybackMode;
  assetId?: string;
};
