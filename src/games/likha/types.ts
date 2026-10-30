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

export type LikhaPartnershipRound = {
  /** The only hearts value entered by the user; the opponent is always 13 - this value. */
  enteredTeamId: string;
  enteredTeamHearts: number;
  /** Official ownership used for team scoring. Individual capturedBy attribution stays optional. */
  cardTeams: Record<LikhaSpecialCard, string>;
};

export type LikhaRoundInput = {
  players: LikhaPlayerCapture[];
  specialCards: Record<LikhaSpecialCard, LikhaSpecialCapture>;
  /** Absent on individual and legacy partnership rounds. */
  partnership?: LikhaPartnershipRound;
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
