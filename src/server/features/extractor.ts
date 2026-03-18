import type { UpsertFeatureSnapshotInput } from "@/src/server/db/repositories";
import type {
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

export const DEFAULT_FEATURE_VERSION = "player-feature-v1";
export const DEFAULT_FEATURE_WINDOW = "recent_20_matches";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value > 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPrismaJsonValue(value: unknown): UpsertFeatureSnapshotInput["featureJson"] {
  return JSON.parse(JSON.stringify(value ?? null)) as UpsertFeatureSnapshotInput["featureJson"];
}

export function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

export function normalizeSide(value: unknown): RoundSide {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["attack", "attacker", "atk"].includes(normalized)) {
    return "attack";
  }
  if (["defense", "defender", "def"].includes(normalized)) {
    return "defense";
  }
  return "unknown";
}

export function normalizeEconomyTier(value: unknown): EconomyTier {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  if (normalized === "pistol") {
    return "pistol";
  }
  if (normalized === "eco") {
    return "eco";
  }
  if (["half_buy", "halfbuy"].includes(normalized)) {
    return "half_buy";
  }
  if (["full_buy", "fullbuy"].includes(normalized)) {
    return "full_buy";
  }
  return "unknown";
}

export function normalizeWeaponGroup(value: unknown): WeaponGroup {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll("-", "_");
  if (normalized === "operator" || normalized === "sniper") {
    return "operator";
  }
  if (normalized === "lmg") {
    return "lmg";
  }
  if (normalized === "rifle") {
    return "rifle";
  }
  if (!normalized) {
    return "unknown";
  }
  return "other";
}

function extractRawRoundCandidates(rawJson: unknown): RawRoundLike[] {
  if (!isRecord(rawJson)) {
    return [];
  }

  if (Array.isArray(rawJson.featureRounds)) {
    return rawJson.featureRounds as RawRoundLike[];
  }

  const matchPayload = isRecord(rawJson.matchPayload) ? rawJson.matchPayload : null;
  if (!matchPayload) {
    return [];
  }

  if (Array.isArray(matchPayload.rounds)) {
    return matchPayload.rounds as RawRoundLike[];
  }

  if (Array.isArray(matchPayload.roundResults)) {
    // TODO(riot-mapping): 실 Riot roundResults 스펙 기준으로 side/won/경제/무기 정보를 정확히 매핑해야 합니다.
    return matchPayload.roundResults.map((item, index) => {
      const current = isRecord(item) ? item : {};
      return {
        roundNumber: toNumber(current.roundNum, index + 1),
        won: toBoolean(current.won, false)
      } satisfies RawRoundLike;
    });
  }

  return [];
}

export function mapRawRoundToRoundFeature(input: {
  matchId: string;
  puuid: string;
  rawRound: RawRoundLike;
  index: number;
}): RoundFeature {
  const roundNumber = Math.max(1, Math.round(toNumber(input.rawRound.roundNumber, input.index + 1)));
  const kills = Math.max(0, Math.round(toNumber(input.rawRound.kills, 0)));
  const headshots = Math.max(0, Math.round(toNumber(input.rawRound.headshots, 0)));

  return {
    matchId: input.matchId,
    puuid: input.puuid,
    roundNumber,
    combat: {
      survived: toBoolean(input.rawRound.survived, false),
      weaponGroup: normalizeWeaponGroup(input.rawRound.weaponGroup),
      kills,
      headshots: Math.min(kills, headshots)
    },
    impact: {
      firstKill: toBoolean(input.rawRound.firstKill, false),
      firstDeath: toBoolean(input.rawRound.firstDeath, false),
      clutchAttempt: toBoolean(input.rawRound.clutchAttempt, false),
      clutchWin: toBoolean(input.rawRound.clutchWin, false)
    },
    economy: {
      tier: normalizeEconomyTier(input.rawRound.economyTier)
    },
    context: {
      side: normalizeSide(input.rawRound.side),
      won: toBoolean(input.rawRound.won, false)
    }
  };
}

export function extractRoundFeaturesFromRawMatch(rawMatch: RawMatchFeatureInput, puuid: string): RoundFeature[] {
  const sourcePuuid = rawMatch.puuid?.trim() || puuid.trim();
  const rounds = extractRawRoundCandidates(rawMatch.rawJson);

  return rounds.map((rawRound, index) =>
    mapRawRoundToRoundFeature({
      matchId: rawMatch.matchId,
      puuid: sourcePuuid,
      rawRound,
      index
    })
  );
}

function countRounds(rounds: RoundFeature[], predicate: (round: RoundFeature) => boolean): number {
  return rounds.reduce((count, round) => (predicate(round) ? count + 1 : count), 0);
}

function calculateCombatMetrics(rounds: RoundFeature[]): MatchFeature["combat"] {
  const roundCount = rounds.length;
  const operatorRounds = countRounds(rounds, (round) => round.combat.weaponGroup === "operator");
  const lmgRounds = countRounds(rounds, (round) => round.combat.weaponGroup === "lmg");
  const rifleRounds = rounds.filter((round) => round.combat.weaponGroup === "rifle");
  const rifleKills = rifleRounds.reduce((acc, round) => acc + round.combat.kills, 0);
  const rifleHeadshots = rifleRounds.reduce((acc, round) => acc + round.combat.headshots, 0);

  return {
    survivalRate: safeRate(countRounds(rounds, (round) => round.combat.survived), roundCount),
    operatorRoundShare: safeRate(operatorRounds, roundCount),
    lmgRoundShare: safeRate(lmgRounds, roundCount),
    rifleOnlyHeadshotRate: safeRate(rifleHeadshots, rifleKills)
  };
}

function calculateImpactMetrics(rounds: RoundFeature[]): MatchFeature["impact"] {
  const roundCount = rounds.length;
  const clutchAttempts = countRounds(rounds, (round) => round.impact.clutchAttempt);
  const clutchWins = countRounds(rounds, (round) => round.impact.clutchAttempt && round.impact.clutchWin);

  return {
    firstKillRate: safeRate(countRounds(rounds, (round) => round.impact.firstKill), roundCount),
    firstDeathRate: safeRate(countRounds(rounds, (round) => round.impact.firstDeath), roundCount),
    clutchWinRate: safeRate(clutchWins, clutchAttempts)
  };
}

function calculateBuyTierWinRate(rounds: RoundFeature[], tier: EconomyTier): number {
  const tierRounds = rounds.filter((round) => round.economy.tier === tier);
  const tierWins = countRounds(tierRounds, (round) => round.context.won);
  return safeRate(tierWins, tierRounds.length);
}

function calculateEconomyMetrics(rounds: RoundFeature[]): MatchFeature["economy"] {
  return {
    pistolWinRate: calculateBuyTierWinRate(rounds, "pistol"),
    ecoWinRate: calculateBuyTierWinRate(rounds, "eco"),
    halfBuyWinRate: calculateBuyTierWinRate(rounds, "half_buy"),
    fullBuyWinRate: calculateBuyTierWinRate(rounds, "full_buy")
  };
}

function calculateSideWinRate(rounds: RoundFeature[], side: RoundSide): number {
  const sideRounds = rounds.filter((round) => round.context.side === side);
  const sideWins = countRounds(sideRounds, (round) => round.context.won);
  return safeRate(sideWins, sideRounds.length);
}

function calculateContextMetrics(rounds: RoundFeature[]): MatchFeature["context"] {
  return {
    attackWinRate: calculateSideWinRate(rounds, "attack"),
    defenseWinRate: calculateSideWinRate(rounds, "defense")
  };
}

export function calculateSampleConfidence(sampleSize: number, targetSample = 120): FeatureConfidence {
  const normalizedSample = Math.max(0, sampleSize);
  const normalizedTarget = Math.max(1, targetSample);
  const score = Math.max(0.05, Math.min(1, normalizedSample / normalizedTarget));
  const label = score < 0.4 ? "low" : score < 0.75 ? "medium" : "high";
  return {
    score,
    label,
    sampleSize: normalizedSample
  };
}

export function buildMatchFeature(rawMatch: RawMatchFeatureInput, puuid: string): MatchFeature {
  const rounds = extractRoundFeaturesFromRawMatch(rawMatch, puuid);
  return {
    matchId: rawMatch.matchId,
    puuid,
    roundCount: rounds.length,
    roundFeatures: rounds,
    combat: calculateCombatMetrics(rounds),
    impact: calculateImpactMetrics(rounds),
    economy: calculateEconomyMetrics(rounds),
    context: calculateContextMetrics(rounds),
    confidence: calculateSampleConfidence(rounds.length, 24)
  };
}

function flattenRounds(matchFeatures: MatchFeature[]): RoundFeature[] {
  return matchFeatures.flatMap((matchFeature) => matchFeature.roundFeatures);
}

function buildEmptyAggregate(puuid: string, featureVersion: string): PlayerAggregateFeature {
  const now = new Date().toISOString();
  const emptyConfidence = calculateSampleConfidence(0, 1);

  return {
    puuid,
    featureVersion,
    extractedAt: now,
    matchCount: 0,
    roundCount: 0,
    sourceMatchIds: [],
    combat: {
      survivalRate: 0,
      operatorRoundShare: 0,
      lmgRoundShare: 0,
      rifleOnlyHeadshotRate: 0
    },
    impact: {
      firstKillRate: 0,
      firstDeathRate: 0,
      clutchWinRate: 0
    },
    economy: {
      pistolWinRate: 0,
      ecoWinRate: 0,
      halfBuyWinRate: 0,
      fullBuyWinRate: 0
    },
    context: {
      attackWinRate: 0,
      defenseWinRate: 0
    },
    confidence: {
      overall: emptyConfidence,
      combat: emptyConfidence,
      impact: emptyConfidence,
      economy: emptyConfidence,
      context: emptyConfidence
    }
  };
}

export function buildPlayerAggregateFeature(
  puuid: string,
  matchFeatures: MatchFeature[],
  featureVersion = DEFAULT_FEATURE_VERSION
): PlayerAggregateFeature {
  if (!matchFeatures.length) {
    return buildEmptyAggregate(puuid, featureVersion);
  }

  const rounds = flattenRounds(matchFeatures);
  const roundCount = rounds.length;
  const sourceMatchIds = matchFeatures.map((matchFeature) => matchFeature.matchId);
  const clutchAttempts = countRounds(rounds, (round) => round.impact.clutchAttempt);

  return {
    puuid,
    featureVersion,
    extractedAt: new Date().toISOString(),
    matchCount: matchFeatures.length,
    roundCount,
    sourceMatchIds,
    combat: calculateCombatMetrics(rounds),
    impact: calculateImpactMetrics(rounds),
    economy: calculateEconomyMetrics(rounds),
    context: calculateContextMetrics(rounds),
    confidence: {
      overall: calculateSampleConfidence(roundCount, 120),
      combat: calculateSampleConfidence(roundCount, 80),
      impact: calculateSampleConfidence(Math.max(roundCount, clutchAttempts * 4), 80),
      economy: calculateSampleConfidence(roundCount, 80),
      context: calculateSampleConfidence(roundCount, 80)
    }
  };
}

export function extractFeaturesForPlayer(
  puuid: string,
  rawMatches: RawMatchFeatureInput[],
  featureVersion = DEFAULT_FEATURE_VERSION
): FeatureExtractionResult {
  const normalizedPuuid = puuid.trim();
  const matchFeatures = rawMatches
    .filter((match) => match.puuid.trim() === normalizedPuuid || !match.puuid.trim())
    .map((match) => buildMatchFeature(match, normalizedPuuid));

  return {
    puuid: normalizedPuuid,
    matchFeatures,
    aggregate: buildPlayerAggregateFeature(normalizedPuuid, matchFeatures, featureVersion)
  };
}

export function buildFeatureSnapshotInput(
  result: FeatureExtractionResult,
  options: FeatureSnapshotBuildOptions = {
    window: DEFAULT_FEATURE_WINDOW,
    version: DEFAULT_FEATURE_VERSION
  }
): UpsertFeatureSnapshotInput {
  return {
    puuid: result.puuid,
    window: options.window,
    version: options.version,
    featureJson: toPrismaJsonValue(result.aggregate),
    sourceMatchIdsJson: toPrismaJsonValue(result.aggregate.sourceMatchIds),
    metadataJson: toPrismaJsonValue({
      extractedAt: result.aggregate.extractedAt,
      matchCount: result.aggregate.matchCount,
      roundCount: result.aggregate.roundCount,
      confidence: result.aggregate.confidence
    })
  };
}
