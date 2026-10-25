import type { AudioPlaybackMode } from '../audio/types';
import type { LikhaMode, LikhaRoundInput, LikhaRules } from '../games/likha/types';

export type { LikhaMode, LikhaRoundInput, LikhaRules, LikhaSpecialCard, LikhaSpecialCapture, LikhaPlayerCapture, LikhaRanking } from '../games/likha/types';

export type GameType = 'trix-slow' | 'trix-fast' | 'cc' | 'tarneeb-61' | 'tarneeb-41' | 'likha';
export type GameStatus = 'active' | 'completed' | 'cancelled';
export type ThemeMode = 'system' | 'light' | 'dark';
export type TrixMode = 'individual' | 'solo' | 'partnership';
export type TrixSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export type GamePlayer = { id: string; name: string; seat: number; profileId?: string };
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
  targetScore: number;
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
  | { kind: 'tarneeb-41-v2'; version: 2; rules: Tarneeb41RulesV2 }
  | { kind: 'fast-trix-v3'; version: 3 }
  | { kind: 'fast-trix-v4'; version: 4 }
  | { kind: 'fast-trix-v5'; version: 5 }
  | { kind: 'cc-v1'; version: 1 }
  | { kind: 'cc-v2'; version: 2 }
  | { kind: 'cc-v3'; version: 3 }
  | { kind: 'likha-v1'; version: 1; rules: LikhaRules };

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
  rulesVersion?: 1 | 2 | 3 | 4 | 5;
  trixMode?: TrixMode;
  /** Missing on legacy Likha sessions means individual mode. */
  likhaMode?: LikhaMode;
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
  phaseByPlayerId?: Record<string, Tarneeb41Phase>;
  entries: Tarneeb41PlayerRoundResult[];
};

export type ManualAdjustmentInput = { targetId: string; amount: number; reason?: string };

export type OldManMetadata = { eaterPlayerId: string; doubled: boolean };
export type SoloLashRoundInput = {
  kind: 'lash-solo';
  scoresByPlayer: Record<string, number>;
  oldMan: OldManMetadata;
};
export type PartnershipLashRoundInput = {
  kind: 'lash-partnership';
  scoresByTeam: Record<string, number>;
  oldMan: OldManMetadata;
};
export type PartnershipFixedTotalLashRoundInput = {
  kind: 'lash-partnership-fixed-total';
  enteredTeamId: string;
  enteredScore: number;
  contractTotal: number;
  oldMan: OldManMetadata;
};
/** Read-only compatibility for sessions created by rules V3. New rounds never use it. */
export type LegacyLashRoundInput = {
  kind: 'lash';
  scoresByPlayer: Record<string, number>;
  oldMan: OldManMetadata;
};
export type LashRoundInput = SoloLashRoundInput | PartnershipFixedTotalLashRoundInput | PartnershipLashRoundInput | LegacyLashRoundInput;
export type TrixRankingInput = { kind: 'trix-ranking'; finishingOrder: [string, string, string, string] };

export type GameRound = {
  id: string;
  gameId: string;
  index: number;
  type: TrixContract | 'lash' | 'trix-ranking' | 'tarneeb' | 'tarneeb-41' | 'likha' | 'manual-adjustment';
  kingdomIndex?: number;
  kingdomOwnerId?: string;
  input: TrixRoundInput | LashRoundInput | TrixRankingInput | TarneebRoundInput | Tarneeb41RoundInput | LikhaRoundInput | ManualAdjustmentInput;
  scoreDelta: Record<string, number>;
  scoreAfter: Record<string, number>;
  createdAt: string;
  note?: string;
};

export type PlayerProfile = { id: string; name: string; photo?: Blob; createdAt: string; updatedAt: string; lastPlayedAt?: string; gamesPlayed?: number };

export type AppSettings = {
  id: 'main';
  theme: ThemeMode;
  vibration: boolean;
  keepAwake: boolean;
  roundReactions?: boolean;
  onboardingSeen: boolean;
  lastActiveGameId?: string;
  preferredTarneebTarget?: number;
  contextualMessages?: boolean;
  roastIntensity?: 1 | 2 | 3 | 4;
  soundEnabled?: boolean;
  masterVolume?: number;
  effectsEnabled?: boolean;
  effectsVolume?: number;
  messageVoiceEnabled?: boolean;
  voiceVolume?: number;
  uiSoundsEnabled?: boolean;
  speechVoiceURI?: string;
  speechVoiceName?: string;
  speechVoiceLang?: string;
  speechRate?: number;
  speechPitch?: number;
};

export type MessageCategory = 'fast-lash' | 'fast-trix' | 'old-man' | 'tarneeb-success' | 'tarneeb-failure' | 'tarneeb-special' | 'cc-lash';
export type MessageEvent = 'lash-owner-score' | 'trix-partnership' | 'old-man' | 'old-man-owner' | 'old-man-partner' | 'old-man-opponent' | 'tarneeb-success' | 'tarneeb-failure' | 'tarneeb-special';
export type MessageRule = {
  id: string;
  factoryId: string;
  category: MessageCategory;
  gameTypes: GameType[];
  event: MessageEvent;
  trixMode?: 'solo' | 'partnership';
  minScore?: number;
  maxScore?: number;
  ownerScore?: number;
  partnerScore?: number;
  doubled?: boolean;
  minOccurrences?: number;
  template: string;
  durationMs: number;
  enabled: boolean;
  priority: number;
  intensity?: 1 | 2 | 3 | 4;
  oldManCategory?: 'normal' | 'doubled' | 'owner' | 'owner-doubled' | 'partner' | 'opponent' | 'repeat' | 'repeat-doubled' | 'magnet' | 'historical';
  historicalRecord?: boolean;
  alternativeGroupId?: string;
  userAdded?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConditionalRuleGame = 'trix-fast' | 'cc' | 'tarneeb-61';
export type ConditionalRuleEvent = 'lash' | 'trix' | 'old-man' | 'tarneeb';
export type ConditionalOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';
export type ConditionalField =
  | 'gameMode' | 'kingdomNumber' | 'ownerProfileId' | 'ownerTeamProfileId' | 'opponentTeamProfileId'
  | 'enteredTeamScore' | 'ownerTeamScore' | 'opponentTeamScore' | 'soloPlayerScore'
  | 'ownerPosition' | 'partnerPosition' | 'targetPlayerPosition' | 'ownerTrixPoints' | 'partnerTrixPoints' | 'teamTrixTotal'
  | 'ownerAheadPartner' | 'partnerAheadOwner' | 'ownerFirst' | 'ownerLast' | 'partnerFirst' | 'partnerLast' | 'pairCombination'
  | 'oldManRole' | 'oldManDoubled' | 'ownerAteOldMan' | 'ownerAteDoubledOldMan' | 'playerAteOwnKingdom'
  | 'oldManCount' | 'doubledOldManCount' | 'targetProfileId' | 'historicalOldManRecord'
  | 'badLashStreak' | 'goodLashStreak' | 'trixFirstStreak' | 'trixFourthStreak'
  | 'bid' | 'actualTricks' | 'succeeded' | 'failed' | 'isKaboot' | 'brokenSeven'
  | 'failureStreak' | 'successStreak' | 'kabootCount' | 'currentTeamScore' | 'opponentScore' | 'matchTarget' | 'remainingToTarget';
export type ConditionalValue = string | number | boolean;
export type ConditionalRuleCondition = { id: string; field: ConditionalField; operator: ConditionalOperator; value: ConditionalValue; valueTo?: number };
export type ConditionalMessageAlternative = { id: string; text: string; enabled: boolean };
export type ConditionalReactionRule = {
  id: string;
  name: string;
  enabled: boolean;
  game: ConditionalRuleGame;
  event: ConditionalRuleEvent;
  conditions: ConditionalRuleCondition[];
  messages: ConditionalMessageAlternative[];
  durationMs: number;
  priority: number;
  exclusive: boolean;
  oncePerMatch: boolean;
  cooldownRounds: number;
  intensity?: 1 | 2 | 3 | 4;
  audioPlaybackMode?: AudioPlaybackMode;
  audioAssetId?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};
export type ConditionalRuleFiring = {
  id: string;
  ruleId: string;
  gameId: string;
  event: ConditionalRuleEvent;
  alternativeId: string;
  roundIndex: number;
  firedAt: string;
};

export type SummarySegmentCategory =
  | 'opening' | 'dramatic-opening' | 'winner' | 'loser' | 'blowout' | 'close-match' | 'disaster'
  | 'comeback' | 'collapse' | 'partnership-praise' | 'partnership-disaster'
  | 'trix-genius' | 'trix-disaster' | 'kingdom-praise' | 'kingdom-disaster'
  | 'old-man' | 'doubled-old-man' | 'repeated-old-man' | 'cc' | 'fast-trix'
  | 'funny-stat' | 'mock-news' | 'mock-medical' | 'mock-police' | 'mock-school'
  | 'mock-job-review' | 'fake-retirement' | 'transfer-market' | 'mock-obituary'
  | 'closing' | 'victory-closing' | 'disaster-closing' | 'title';
export type ContentOverride = {
  id: string;
  factoryId: string;
  category: SummarySegmentCategory;
  template?: string;
  enabled?: boolean;
  updatedAt: string;
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
  version: 1 | 2 | 3 | 4 | 5;
  exportedAt: string;
  data: {
    games: GameSession[];
    rounds: GameRound[];
    players: PlayerProfile[];
    presets: RulePreset[];
    settings: AppSettings[];
    messageRules?: MessageRule[];
    contentOverrides?: ContentOverride[];
    conditionalRules?: ConditionalReactionRule[];
    conditionalRuleFirings?: ConditionalRuleFiring[];
  };
};
