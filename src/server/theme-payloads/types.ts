export type ThemeFeatureKey = "combat" | "impact" | "economy" | "context";
export type ThemeFeatureMetricValue = number | string;
export type ThemeFeatureMetrics = Record<string, ThemeFeatureMetricValue>;
export type ThemeFeatureConfidence = "low" | "medium" | "high";

export type ThemeFeaturePayload<
  TMetrics extends ThemeFeatureMetrics = ThemeFeatureMetrics,
  TTheme extends ThemeFeatureKey = ThemeFeatureKey
> = {
  theme: TTheme;
  sampleMatches: number;
  sampleRounds: number;
  confidence: ThemeFeatureConfidence;
  metrics: TMetrics;
};

export interface CombatThemeMetrics extends ThemeFeatureMetrics {
  survivalRate: number;
  operatorRoundShare: number;
  lmgRoundShare: number;
  rifleOnlyHeadshotRate: number;
}

export interface ImpactThemeMetrics extends ThemeFeatureMetrics {
  firstKillRate: number;
  firstDeathRate: number;
  clutchWinRate: number;
  openingDelta: number;
}

export interface EconomyThemeMetrics extends ThemeFeatureMetrics {
  pistolWinRate: number;
  ecoWinRate: number;
  halfBuyWinRate: number;
  fullBuyWinRate: number;
  fullVsEcoGap: number;
}

export interface ContextThemeMetrics extends ThemeFeatureMetrics {
  attackWinRate: number;
  defenseWinRate: number;
  attackVsDefenseGap: number;
}

export type CombatThemeFeaturePayload = ThemeFeaturePayload<CombatThemeMetrics, "combat">;
export type ImpactThemeFeaturePayload = ThemeFeaturePayload<ImpactThemeMetrics, "impact">;
export type EconomyThemeFeaturePayload = ThemeFeaturePayload<EconomyThemeMetrics, "economy">;
export type ContextThemeFeaturePayload = ThemeFeaturePayload<ContextThemeMetrics, "context">;

export interface ThemeFeaturePayloadMap {
  combat: CombatThemeFeaturePayload;
  impact: ImpactThemeFeaturePayload;
  economy: EconomyThemeFeaturePayload;
  context: ContextThemeFeaturePayload;
}
