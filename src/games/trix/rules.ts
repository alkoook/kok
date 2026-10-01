import type { TrixContract, TrixRules, TrixSuit } from '../../types';

export const TRIX_QUEENS: { id: TrixSuit; label: string }[] = [
  { id: 'hearts', label: 'بنت الكوبة' },
  { id: 'diamonds', label: 'بنت الديناري' },
  { id: 'clubs', label: 'بنت السباتي' },
  { id: 'spades', label: 'بنت البستوني' }
];

export const DEFAULT_TRIX_RULES: TrixRules = {
  version: 2,
  kingPenalty: -75,
  queenPenalty: -25,
  queenCount: 4,
  diamondPenalty: -10,
  diamondCount: 13,
  trickPenalty: -15,
  trickCount: 13,
  trixRanks: [200, 150, 100, 50],
  doublingEnabled: true
};

export const TRIX_RULES_VERSION = 2 as const;

export const SLOW_CONTRACTS: TrixContract[] = ['king', 'queens', 'diamonds', 'tricks', 'trix'];
export const FAST_CONTRACTS: TrixContract[] = ['complex', 'trix'];

export const CONTRACT_LABELS: Record<TrixContract, string> = {
  king: 'شيخ الكبة',
  queens: 'بنات',
  diamonds: 'ديناري',
  tricks: 'لطوش',
  trix: 'تركس',
  complex: 'كومبلكس'
};
