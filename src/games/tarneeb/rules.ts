import type { Tarneeb41RulesV2, Tarneeb61RulesV2, TarneebScoringRules } from '../../types';

export const TARNEEB_61_RULES_VERSION = 2 as const;
export const TARNEEB_41_RULES_VERSION = 2 as const;
export const TARNEEB_61_RULES_V2: Tarneeb61RulesV2 = { version: 2, targetScore: 61, minimumBid: 7, maximumBid: 13 };
export const TARNEEB_41_RULES_V2: Tarneeb41RulesV2 = { version: 2, targetScore: 41, minimumTotalBids: 11, maximumBid: 13 };

export const createUnconfirmedTarneebRules = (targetScore: 61 | 41): TarneebScoringRules => ({
  targetScore,
  minimumBid: targetScore === 61 ? 7 : 1,
  maximumBid: 13,
  scoringOnSuccessfulBid: 'actual-tricks',
  failedBidPenalty: 'subtract-bid',
  opponentsScoreOnBidSuccess: 'actual-tricks',
  opponentsScoreOnBidFailure: 'actual-tricks',
  allowNegativeScore: true,
  enableKaboot: false,
  exactTargetRequired: false,
  winWhenGreaterOrEqual: true,
  confirmed: false
});
