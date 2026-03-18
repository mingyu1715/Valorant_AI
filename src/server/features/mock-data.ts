import { extractFeaturesForPlayer } from "@/src/server/features/extractor";
import type { FeatureExtractionResult, RawMatchFeatureInput } from "@/src/server/features/types";

export function createMockRawMatchesForFeatureDemo(puuid: string): RawMatchFeatureInput[] {
  return [
    {
      matchId: "feature-mock-match-001",
      puuid,
      gameStartAt: new Date("2026-03-17T09:10:00.000Z"),
      rawJson: {
        schemaVersion: "raw-match-v1",
        featureRounds: [
          { roundNumber: 1, side: "attack", won: true, economyTier: "pistol", weaponGroup: "other", survived: true, firstKill: true, firstDeath: false, clutchAttempt: false, clutchWin: false, kills: 1, headshots: 1 },
          { roundNumber: 2, side: "attack", won: false, economyTier: "eco", weaponGroup: "rifle", survived: false, firstKill: false, firstDeath: true, clutchAttempt: false, clutchWin: false, kills: 0, headshots: 0 },
          { roundNumber: 3, side: "attack", won: true, economyTier: "full_buy", weaponGroup: "operator", survived: true, firstKill: false, firstDeath: false, clutchAttempt: false, clutchWin: false, kills: 2, headshots: 0 },
          { roundNumber: 4, side: "defense", won: false, economyTier: "half_buy", weaponGroup: "lmg", survived: false, firstKill: false, firstDeath: true, clutchAttempt: false, clutchWin: false, kills: 1, headshots: 0 },
          { roundNumber: 5, side: "defense", won: true, economyTier: "full_buy", weaponGroup: "rifle", survived: true, firstKill: true, firstDeath: false, clutchAttempt: true, clutchWin: true, kills: 2, headshots: 1 },
          { roundNumber: 6, side: "defense", won: false, economyTier: "eco", weaponGroup: "rifle", survived: false, firstKill: false, firstDeath: true, clutchAttempt: true, clutchWin: false, kills: 1, headshots: 1 }
        ]
      }
    },
    {
      matchId: "feature-mock-match-002",
      puuid,
      gameStartAt: new Date("2026-03-16T14:20:00.000Z"),
      rawJson: {
        schemaVersion: "raw-match-v1",
        featureRounds: [
          { roundNumber: 1, side: "attack", won: false, economyTier: "pistol", weaponGroup: "other", survived: false, firstKill: false, firstDeath: true, clutchAttempt: false, clutchWin: false, kills: 0, headshots: 0 },
          { roundNumber: 2, side: "attack", won: true, economyTier: "half_buy", weaponGroup: "rifle", survived: true, firstKill: true, firstDeath: false, clutchAttempt: false, clutchWin: false, kills: 2, headshots: 1 },
          { roundNumber: 3, side: "attack", won: true, economyTier: "full_buy", weaponGroup: "rifle", survived: true, firstKill: true, firstDeath: false, clutchAttempt: false, clutchWin: false, kills: 3, headshots: 2 },
          { roundNumber: 4, side: "defense", won: true, economyTier: "eco", weaponGroup: "lmg", survived: true, firstKill: false, firstDeath: false, clutchAttempt: false, clutchWin: false, kills: 1, headshots: 0 },
          { roundNumber: 5, side: "defense", won: false, economyTier: "full_buy", weaponGroup: "operator", survived: false, firstKill: false, firstDeath: true, clutchAttempt: false, clutchWin: false, kills: 1, headshots: 0 },
          { roundNumber: 6, side: "defense", won: true, economyTier: "full_buy", weaponGroup: "rifle", survived: true, firstKill: false, firstDeath: false, clutchAttempt: true, clutchWin: true, kills: 1, headshots: 1 }
        ]
      }
    }
  ];
}

export function extractMockFeatureExample(puuid = "demo-puuid"): FeatureExtractionResult {
  const rawMatches = createMockRawMatchesForFeatureDemo(puuid);
  return extractFeaturesForPlayer(puuid, rawMatches);
}
