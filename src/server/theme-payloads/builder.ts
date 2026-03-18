import type {
  CombatThemeFeaturePayload,
  ContextThemeFeaturePayload,
  EconomyThemeFeaturePayload,
  ImpactThemeFeaturePayload,
  ThemeFeatureKey,
  ThemeFeatureMetrics,
  ThemeFeaturePayload,
  ThemeFeaturePayloadMap
} from "@/src/server/theme-payloads/types";
import type { PlayerAggregateFeature } from "@/src/server/features/types";

function toMetricValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

function buildBaseThemeFeaturePayload<TTheme extends ThemeFeatureKey, TMetrics extends ThemeFeatureMetrics>(
  theme: TTheme,
  aggregateFeatures: PlayerAggregateFeature,
  metrics: TMetrics
): ThemeFeaturePayload<TMetrics, TTheme> {
  return {
    theme,
    sampleMatches: aggregateFeatures.matchCount,
    sampleRounds: aggregateFeatures.roundCount,
    confidence: aggregateFeatures.confidence[theme].label,
    metrics
  };
}

export function buildCombatThemeFeaturePayload(aggregateFeatures: PlayerAggregateFeature): CombatThemeFeaturePayload {
  return buildBaseThemeFeaturePayload("combat", aggregateFeatures, {
    survivalRate: toMetricValue(aggregateFeatures.combat.survivalRate),
    operatorRoundShare: toMetricValue(aggregateFeatures.combat.operatorRoundShare),
    lmgRoundShare: toMetricValue(aggregateFeatures.combat.lmgRoundShare),
    rifleOnlyHeadshotRate: toMetricValue(aggregateFeatures.combat.rifleOnlyHeadshotRate)
  });
}

export function buildImpactThemeFeaturePayload(aggregateFeatures: PlayerAggregateFeature): ImpactThemeFeaturePayload {
  return buildBaseThemeFeaturePayload("impact", aggregateFeatures, {
    firstKillRate: toMetricValue(aggregateFeatures.impact.firstKillRate),
    firstDeathRate: toMetricValue(aggregateFeatures.impact.firstDeathRate),
    clutchWinRate: toMetricValue(aggregateFeatures.impact.clutchWinRate),
    openingDelta: toMetricValue(aggregateFeatures.impact.firstKillRate - aggregateFeatures.impact.firstDeathRate)
  });
}

export function buildEconomyThemeFeaturePayload(aggregateFeatures: PlayerAggregateFeature): EconomyThemeFeaturePayload {
  return buildBaseThemeFeaturePayload("economy", aggregateFeatures, {
    pistolWinRate: toMetricValue(aggregateFeatures.economy.pistolWinRate),
    ecoWinRate: toMetricValue(aggregateFeatures.economy.ecoWinRate),
    halfBuyWinRate: toMetricValue(aggregateFeatures.economy.halfBuyWinRate),
    fullBuyWinRate: toMetricValue(aggregateFeatures.economy.fullBuyWinRate),
    fullVsEcoGap: toMetricValue(aggregateFeatures.economy.fullBuyWinRate - aggregateFeatures.economy.ecoWinRate)
  });
}

export function buildContextThemeFeaturePayload(aggregateFeatures: PlayerAggregateFeature): ContextThemeFeaturePayload {
  return buildBaseThemeFeaturePayload("context", aggregateFeatures, {
    attackWinRate: toMetricValue(aggregateFeatures.context.attackWinRate),
    defenseWinRate: toMetricValue(aggregateFeatures.context.defenseWinRate),
    attackVsDefenseGap: toMetricValue(aggregateFeatures.context.attackWinRate - aggregateFeatures.context.defenseWinRate)
  });
}

export function buildThemeFeaturePayloadMap(aggregateFeatures: PlayerAggregateFeature): ThemeFeaturePayloadMap {
  return {
    combat: buildCombatThemeFeaturePayload(aggregateFeatures),
    impact: buildImpactThemeFeaturePayload(aggregateFeatures),
    economy: buildEconomyThemeFeaturePayload(aggregateFeatures),
    context: buildContextThemeFeaturePayload(aggregateFeatures)
  };
}
