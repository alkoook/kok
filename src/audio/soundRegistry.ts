import type { AudioEvent, FactorySoundAsset } from './types';

export const FACTORY_SOUNDS: FactorySoundAsset[] = [
  { id: 'factory-soft-tap', name: 'نقرة هادئة', source: 'factory', channel: 'ui', frequencies: [520], durationMs: 70, wave: 'sine' },
  { id: 'factory-save', name: 'حفظ الجولة', source: 'factory', channel: 'ui', frequencies: [420, 620], durationMs: 150, wave: 'sine' },
  { id: 'factory-success', name: 'نجاح', source: 'factory', channel: 'reaction', frequencies: [440, 660, 880], durationMs: 420, wave: 'triangle' },
  { id: 'factory-failure', name: 'فشل', source: 'factory', channel: 'reaction', frequencies: [260, 180], durationMs: 430, wave: 'sawtooth' },
  { id: 'factory-heavy-failure', name: 'فشل ثقيل', source: 'factory', channel: 'reaction', frequencies: [180, 110, 75], durationMs: 720, wave: 'square' },
  { id: 'factory-old-man', name: 'الختيار', source: 'factory', channel: 'reaction', frequencies: [190, 240, 170], durationMs: 600, wave: 'triangle' },
  { id: 'factory-old-man-doubled', name: 'الختيار المدبل', source: 'factory', channel: 'reaction', frequencies: [170, 120, 170, 95], durationMs: 900, wave: 'sawtooth' },
  { id: 'factory-old-man-repeat', name: 'تكرار الختيار', source: 'factory', channel: 'reaction', frequencies: [190, 240, 170, 145, 105], durationMs: 1050, wave: 'triangle' },
  { id: 'factory-kaboot', name: 'كبوت', source: 'factory', channel: 'victory', frequencies: [392, 523, 659, 784], durationMs: 850, wave: 'triangle' },
  { id: 'factory-transition', name: 'انتقال المملكة', source: 'factory', channel: 'reaction', frequencies: [330, 440], durationMs: 320, wave: 'sine' },
  { id: 'factory-victory', name: 'انتصار', source: 'factory', channel: 'victory', frequencies: [330, 440, 554, 659, 880], durationMs: 1200, wave: 'triangle' }
];

export const DEFAULT_EVENT_SOUNDS: Record<AudioEvent, string> = {
  'ui-tap': 'factory-soft-tap', 'round-saved': 'factory-save',
  'lash-saved': 'factory-save', 'lash-good': 'factory-success', 'lash-bad': 'factory-failure', 'lash-disaster': 'factory-heavy-failure',
  'trix-first': 'factory-success', 'trix-last': 'factory-failure',
  'old-man': 'factory-old-man', 'old-man-doubled': 'factory-old-man-doubled', 'old-man-repeat': 'factory-old-man-repeat',
  'kingdom-complete': 'factory-transition', 'match-complete': 'factory-victory', victory: 'factory-victory', disaster: 'factory-heavy-failure',
  'contract-success': 'factory-success', 'contract-failure': 'factory-failure', 'broken-seven': 'factory-heavy-failure', kaboot: 'factory-kaboot', 'second-kaboot': 'factory-victory',
  'success-streak': 'factory-success', 'failure-streak': 'factory-heavy-failure'
};

export const AUDIO_EVENT_LABELS: Record<AudioEvent, string> = {
  'ui-tap': 'نقرة واجهة', 'round-saved': 'حفظ جولة', 'lash-saved': 'حفظ لطش', 'lash-good': 'لطش جيد', 'lash-bad': 'لطش سيئ', 'lash-disaster': 'كارثة لطش',
  'trix-first': 'الأول في التركس', 'trix-last': 'الأخير في التركس', 'old-man': 'الختيار', 'old-man-doubled': 'الختيار المدبل', 'old-man-repeat': 'تكرار الختيار',
  'kingdom-complete': 'اكتمال المملكة', 'match-complete': 'نهاية المباراة', victory: 'فوز', disaster: 'كارثة', 'contract-success': 'نجاح الضمان',
  'contract-failure': 'فشل الضمان', 'broken-seven': 'انكسار السبعة', kaboot: 'كبوت', 'second-kaboot': 'الكبوت الثاني', 'success-streak': 'سلسلة نجاح', 'failure-streak': 'سلسلة فشل'
};

export const factorySoundById = (id: string) => FACTORY_SOUNDS.find((sound) => sound.id === id);
