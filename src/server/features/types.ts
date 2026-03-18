import type { RawMatchRecordForFeatureExtraction } from "@/src/server/db/repositories";

export type RoundSide = "attack" | "defense" | "unknown";
export type EconomyTier = "pistol" | "eco" | "half_buy" | "full_buy" | "unknown";
export type WeaponGroup = "operator" | "lmg" | "rifle" | "other" | "unknown";

export interface RoundFeature {
  matchId: string;
  puuid: string;
  roundNumber: number;

  combat: {
    survived: boolean;
    weaponGroup: WeaponGroup;
    kills: number;
    headshots: number;
  };

  impact: {
    firstKill: boolean;
    firstDeath: boolean;
    clutchAttempt: boolean;
    clutchWin: boolean;
  };

  economy: {
    tier: EconomyTier;
  };

  context: {
    side: RoundSide;
    won: boolean;
  };
}

export interface MatchFeature {
  matchId: string;
  puuid: string;
  roundCount: number;
  roundFeatures: RoundFeature[];

  combat: {
    survivalRate: number;
    operatorRoundShare: number;
    lmgRoundShare: number;
    rifleOnlyHeadshotRate: number;
  };

  impact: {
    firstKillRate: number;
    firstDeathRate: number;
    clutchWinRate: number;
  };

  economy: {
    pistolWinRate: number;
    ecoWinRate: number;
    halfBuyWinRate: number;
    fullBuyWinRate: number;
  };

  context: {
    attackWinRate: number;
    defenseWinRate: number;
  };

  confidence: {
    score: number;
    label: "low" | "medium" | "high";
    sampleSize: number;
  };
}

export interface FeatureConfidence {
  score: number;
  label: "low" | "medium" | "high";
  sampleSize: number;
}

export interface PlayerAggregateFeature {
  puuid: string;
  featureVersion: string;
  extractedAt: string;
  matchCount: number;
  roundCount: number;
  sourceMatchIds: string[];

  combat: {
    survivalRate: number;
    operatorRoundShare: number;
    lmgRoundShare: number;
    rifleOnlyHeadshotRate: number;
  };

  impact: {
    firstKillRate: number;
    firstDeathRate: number;
    clutchWinRate: number;
  };

  economy: {
    pistolWinRate: number;
    ecoWinRate: number;
    halfBuyWinRate: number;
    fullBuyWinRate: number;
  };

  context: {
    attackWinRate: number;
    defenseWinRate: number;
  };

  confidence: {
    overall: FeatureConfidence;
    combat: FeatureConfidence;
    impact: FeatureConfidence;
    economy: FeatureConfidence;
    context: FeatureConfidence;
  };
}

export interface FeatureSnapshotBuildOptions {
  window: string;
  version: string;
}

export interface FeatureExtractionResult {
  puuid: string;
  matchFeatures: MatchFeature[];
  aggregate: PlayerAggregateFeature;
}

export type RawMatchFeatureInput = Pick<RawMatchRecordForFeatureExtraction, "matchId" | "puuid" | "rawJson" | "gameStartAt">;

export interface RawRoundLike {
  roundNumber?: number | null;
  side?: unknown;
  won?: unknown;
  economyTier?: unknown;
  weaponGroup?: unknown;
  survived?: unknown;
  firstKill?: unknown;
  firstDeath?: unknown;
  clutchAttempt?: unknown;
  clutchWin?: unknown;
  kills?: unknown;
  headshots?: unknown;
}
