export type GameType = 'trix-slow' | 'trix-fast' | 'tarneeb-61' | 'tarneeb-41';
export type GameStatus = 'active' | 'completed' | 'cancelled';
export type ThemeMode = 'system' | 'light' | 'dark';
export type TrixMode = 'individual' | 'partnership';
export type TrixSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type GamePlayer = { id: string; name: string; seat: number };
export type GameTeam = { id: string; name: string; playerIds: [string, string] };

export type TrixContract = 'king' | 'queens' | 'diamonds' | 'tricks' | 'trix' | 'complex';

export type TrixRules = {
  version?: 1 | 2;
  kingPenalty: number;
  queenPenalty: number;
  queenCount: number;
  diamondPenalty: number;
  diamondCount: number;
  trickPenalty: number;
  trickCount: number;
  trixRanks: [number, number, number, number];
  doublingEnabled: boolean;
};

export type TarneebScoringRules = {
  version?: 1;
  targetScore: number;
  minimumBid: number;
  maximumBid: number;
  scoringOnSuccessfulBid: 'actual-tricks' | 'bid-value';
  failedBidPenalty: 'subtract-bid' | 'subtract-actual-tricks' | 'custom';
  failedBidCustomValue?: number;
  opponentsScoreOnBidSuccess: 'actual-tricks' | 'zero' | 'custom';
  opponentsSuccessCustomValue?: number;
  opponentsScoreOnBidFailure: 'actual-tricks' | 'fixed' | 'custom';
  opponentsFailureValue?: number;
  allowNegativeScore: boolean;
  enableKaboot: boolean;
  kabootValue?: number;
  exactTargetRequired: boolean;
  winWhenGreaterOrEqual: boolean;
  confirmed: boolean;
};

export type Tarneeb61RulesV2 = {
  version: 2;
  targetScore: 61;
  minimumBid: 7;
  maximumBid: 13;
};

export type Tarneeb41Phase = 'normal' | 'thirty' | 'blocked-41';

export type Tarneeb41RulesV2 = {
  version: 2;
  targetScore: 41;
  minimumTotalBids: 11;
  maximumBid: 13;
};

export type RulesSnapshot =
  | { kind: 'trix'; version?: 1 | 2; rules: TrixRules }
  | { kind: 'tarneeb'; version?: 1; rules: TarneebScoringRules }
  | { kind: 'tarneeb-61-v2'; version: 2; rules: Tarneeb61RulesV2 }
  | { kind: 'tarneeb-41-v2'; version: 2; rules: Tarneeb41RulesV2 };

export type GameSession = {
  id: string;
  gameType: GameType;
  status: GameStatus;
  players: GamePlayer[];
  teams?: GameTeam[];
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
  currentRound: number;
  scores: Record<string, number>;
  rulesSnapshot: RulesSnapshot;
  rulesVersion?: 1 | 2;
  trixMode?: TrixMode;
  firstKingdomOwnerId?: string;
  winnerIds?: string[];
};

export type DoubledQueenResult = {
  id: TrixSuit | string;
  suit?: TrixSuit;
  takenByPlayerId?: string;
  takenByTeamId?: string;
  doubled: boolean;
  doubledByPlayerId?: string;
};

export type TrixRoundInput =
  | { contract: 'king'; selectedPlayerId?: string; selectedTeamId?: string; doubled?: boolean; doubledByPlayerId?: string }
  | { contract: 'queens'; counts?: Record<string, number>; queens?: DoubledQueenResult[] }
  | { contract: 'diamonds'; counts: Record<string, number> }
  | { contract: 'tricks'; counts: Record<string, number> }
  | { contract: 'trix'; order: string[] }
  | {
      contract: 'complex';
      kingPlayerId?: string;
      kingTeamId?: string;
      kingDoubled?: boolean;
      kingDoubledByPlayerId?: string;
      queens: Record<string, number> | DoubledQueenResult[];
      diamonds: Record<string, number>;
      tricks: Record<string, number>;
    };

export type TarneebRoundInput = {
  bidderId: string;
  bidderTeamId: string;
  bid: number;
  teamOneTricks: number;
  suit?: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  note?: string;
};

export type Tarneeb41PlayerRoundInput = { playerId: string; bid: number; actualTricks: number };
export type Tarneeb41PlayerRoundResult = Tarneeb41PlayerRoundInput & {
  contractValue: number;
  success: boolean;
  scoreDelta: number;
};
export type Tarneeb41RoundInput = {
  phaseAtRoundStart: Tarneeb41Phase;
  entries: Tarneeb41PlayerRoundResult[];
};

export type ManualAdjustmentInput = { targetId: string; amount: number; reason?: string };

export type GameRound = {
  id: string;
  gameId: string;
  index: number;
  type: TrixContract | 'tarneeb' | 'tarneeb-41' | 'manual-adjustment';
  kingdomIndex?: number;
  kingdomOwnerId?: string;
  input: TrixRoundInput | TarneebRoundInput | Tarneeb41RoundInput | ManualAdjustmentInput;
  scoreDelta: Record<string, number>;
  scoreAfter: Record<string, number>;
  createdAt: string;
  note?: string;
};

export type PlayerProfile = { id: string; name: string; gamesPlayed: number; lastPlayedAt: string };

export type AppSettings = {
  id: 'main';
  theme: ThemeMode;
  vibration: boolean;
  keepAwake: boolean;
  roundReactions?: boolean;
  onboardingSeen: boolean;
  lastActiveGameId?: string;
};

export type RulePreset = {
  id: GameType;
  gameType: GameType;
  name: string;
  rules: TrixRules | TarneebScoringRules;
  updatedAt: string;
};

export type BackupFile = {
  app: 'Lammatna' | 'KOK';
  version: 1 | 2;
  exportedAt: string;
  data: {
    games: GameSession[];
    rounds: GameRound[];
    players: PlayerProfile[];
    presets: RulePreset[];
    settings: AppSettings[];
  };
};
