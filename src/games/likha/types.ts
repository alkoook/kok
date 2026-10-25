export const LIKHA_SPECIAL_CARDS = ['jackDiamonds', 'queenSpades', 'kingClubs', 'tenDiamonds'] as const;

export type LikhaSpecialCard = typeof LIKHA_SPECIAL_CARDS[number];
export type LikhaMode = 'individual' | 'partnership';

export type LikhaPlayerCapture = {
  playerId: string;
  heartsCount: number;
};

export type LikhaSpecialCapture = {
  capturedBy: string;
  doubled: boolean;
};

export type LikhaRoundInput = {
  players: LikhaPlayerCapture[];
  specialCards: Record<LikhaSpecialCard, LikhaSpecialCapture>;
};

export type LikhaRules = {
  version: 1;
  lossLimit: number;
};

export type LikhaRanking = {
  playerId: string;
  score: number;
  rank: number;
  winner: boolean;
};
