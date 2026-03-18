export {
  DEFAULT_FEATURE_VERSION,
  DEFAULT_FEATURE_WINDOW,
  buildFeatureSnapshotInput,
  buildMatchFeature,
  buildPlayerAggregateFeature,
  calculateSampleConfidence,
  extractFeaturesForPlayer,
  extractRoundFeaturesFromRawMatch,
  mapRawRoundToRoundFeature,
  normalizeEconomyTier,
  normalizeSide,
  normalizeWeaponGroup,
  safeRate
} from "@/src/server/features/extractor";

export { createMockRawMatchesForFeatureDemo, extractMockFeatureExample } from "@/src/server/features/mock-data";

export {
  extractAndSaveFeaturesForPlayerFromDb,
  extractAndSaveFeaturesFromRawMatches,
  extractFeaturesFromRawMatches
} from "@/src/server/features/service";

export type {
  EconomyTier,
  FeatureConfidence,
  FeatureExtractionResult,
  FeatureSnapshotBuildOptions,
  MatchFeature,
  PlayerAggregateFeature,
  RawMatchFeatureInput,
  RawRoundLike,
  RoundFeature,
  RoundSide,
  WeaponGroup
} from "@/src/server/features/types";
