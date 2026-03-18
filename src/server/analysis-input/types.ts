export type AnalysisThemeKey = "combat" | "economy" | "context";

export interface PlayerSummaryAnalysisInput {
  winRate: number;
  avgRoundsPlayed: number;
  avgAttackRoundsWon: number;
  avgDefenseRoundsWon: number;
  mainAgent: string | null;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKD: number;
  avgACS: number;
  avgKAST: number;
  avgHSPercent: number;
  avgFirstKills: number;
  avgFirstDeaths: number;
  avgADR: number;
  avgDDA: number;
  avgScore: number;
}

export interface MatchCommonAnalysisInput {
  map: string;
  result: "win" | "loss" | "unknown";
  roundsPlayed: number;
  attackRoundsWon: number;
  defenseRoundsWon: number;
  agent: string | null;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  acs: number;
  kast: number;
  hsPercent: number;
  firstKills: number;
  firstDeaths: number;
  adr: number;
  dda: number;
  score: number;
}

export interface MatchCombatAnalysisInput {
  killsPerRound: number;
  deathsPerRound: number;
  assistsPerRound: number;
  kills2: number;
  kills3: number;
  kills4: number;
  kills5: number;
  multiKillRate: number;
  tradeKills: number;
  tradedDeaths: number;
  firstKillRate: number;
  firstDeathRate: number;
  aceCount: number;
  aceRate: number;
  clutchCount: number;
  clutchWinRate: number;
}

export interface MatchEconomyAnalysisInput {
  avgLoadoutValue: number;
  avgSpent: number;
  avgRemaining: number;
  ecoRoundRate: number;
  forceRoundRate: number;
  fullBuyRoundRate: number;
  saveRoundRate: number;
  avgCreditsSpentPerRound: number;
  avgCreditsRemainingPerRound: number;
  ecoWinRate: number;
  forceWinRate: number;
  fullBuyWinRate: number;
  avgDamagePerCredit: number;
  avgScorePerCredit: number;
  ecoCount: number;
  forceCount: number;
  fullBuyCount: number;
  saveCount: number;
}

export interface MatchContextAnalysisInput {
  plantCount: number;
  defuseCount: number;
  plantRoundRate: number;
  defuseRoundRate: number;
  attackWinRate: number;
  defenseWinRate: number;
  winStreak: number;
  loseStreak: number;
  maxWinStreak: number;
  maxLoseStreak: number;
  clutchCount: number;
  clutchWinRate: number;
  aceCount: number;
  aceRate: number;
}

export interface MatchAnalysisInput {
  common: MatchCommonAnalysisInput;
  combat: MatchCombatAnalysisInput;
  economy: MatchEconomyAnalysisInput;
  context: MatchContextAnalysisInput;
}

export interface PlayerAnalysisInput {
  playerSummary: PlayerSummaryAnalysisInput;
  matches: MatchAnalysisInput[];
}

export interface ThemeCombatAnalysisInputPayload {
  theme: "combat";
  playerSummary: PlayerSummaryAnalysisInput;
  matches: Array<{
    common: MatchCommonAnalysisInput;
    combat: MatchCombatAnalysisInput;
  }>;
}

export interface ThemeEconomyAnalysisInputPayload {
  theme: "economy";
  playerSummary: PlayerSummaryAnalysisInput;
  matches: Array<{
    common: MatchCommonAnalysisInput;
    economy: MatchEconomyAnalysisInput;
  }>;
}

export interface ThemeContextAnalysisInputPayload {
  theme: "context";
  playerSummary: PlayerSummaryAnalysisInput;
  matches: Array<{
    common: MatchCommonAnalysisInput;
    context: MatchContextAnalysisInput;
  }>;
}

export type ThemeAnalysisInputPayload =
  | ThemeCombatAnalysisInputPayload
  | ThemeEconomyAnalysisInputPayload
  | ThemeContextAnalysisInputPayload;

export interface ThemeAnalysisInputPayloadMap {
  combat: ThemeCombatAnalysisInputPayload;
  economy: ThemeEconomyAnalysisInputPayload;
  context: ThemeContextAnalysisInputPayload;
}
