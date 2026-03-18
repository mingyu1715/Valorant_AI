export type SectionKey = "attack_defense" | "economy" | "clutch" | "utility";
export type JobStatus = "queued" | "collecting" | "analyzing" | "completed" | "failed";
export type SectionStatus = "pending" | "running" | "completed" | "error";

export interface PlayerPayload {
  riotId: string;
  riotTag: string;
  puuidMasked: string;
}

export interface OverviewRaw {
  matchesAnalyzed: number;
  wins: number;
  losses: number;
  matchWinRate: number;
  kills: number;
  deaths: number;
  assists: number;
  rounds: number;
  acs: number;
  kdaRatio: number;
}

export interface OverviewPayload {
  facts: string[];
  raw: OverviewRaw;
}

export interface FinalSummaryPayload {
  headline: string;
  analysisParagraph: string;
  playstyle?: string;
  coreStrength?: string;
  coreWeakness?: string;
  priorityFocus?: string[];
}

export interface SectionAnalysis {
  headline: string;
  summary: string;
  actions: string[];
  strengths?: string[];
  weaknesses?: string[];
  priorityDirections?: string[];
}

export interface SectionPayload {
  key: SectionKey;
  title: string;
  facts: string[];
  raw: Record<string, unknown>;
}

export interface JobSectionPayload extends SectionPayload {
  status: SectionStatus;
  analysis: SectionAnalysis | null;
  error: string | null;
}

export interface AnalysisSnapshot {
  jobId: string;
  ownerPuuid?: string;
  status: JobStatus;
  currentStep: string;
  player: PlayerPayload;
  overview: {
    facts: string[];
    raw?: OverviewRaw;
  };
  progress: {
    completed: number;
    total: number;
    currentKey: SectionKey | null;
  };
  finalSummary?: FinalSummaryPayload | null;
  sections: JobSectionPayload[];
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SectionConfig {
  key: SectionKey;
  title: string;
  focus: string;
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "error";
  source: string;
  message: string;
  context: unknown | null;
}

export interface AccountInfo {
  puuid: string;
  gameName: string;
  tagLine: string;
  requestUrl: string;
}

export interface RiotPlayerAbilityCasts {
  grenadeCasts?: number;
  ability1Casts?: number;
  ability2Casts?: number;
  ultimateCasts?: number;
}

export interface RiotPlayerStats {
  kills?: number;
  deaths?: number;
  assists?: number;
  roundsPlayed?: number;
  score?: number;
  abilityCasts?: RiotPlayerAbilityCasts;
}

export interface RiotPlayer {
  puuid?: string;
  teamId?: string;
  characterId?: string;
  isObserver?: boolean;
  stats?: RiotPlayerStats;
}

export interface RiotTeam {
  teamId?: string;
  won?: boolean;
  roundsWon?: number;
  roundsPlayed?: number;
}

export interface RiotFinishingDamage {
  damageType?: string;
}

export interface RiotKill {
  timeSinceRoundStartMillis?: number;
  killer?: string;
  victim?: string;
  assistants?: string[];
  finishingDamage?: RiotFinishingDamage;
}

export interface RiotDamageEvent {
  receiver?: string;
  damage?: number;
}

export interface RiotEconomy {
  loadoutValue?: number;
  spent?: number;
}

export interface RiotRoundAbility {
  grenadeEffects?: string;
  ability1Effects?: string;
  ability2Effects?: string;
  ultimateEffects?: string;
}

export interface RiotRoundPlayerStats {
  puuid?: string;
  kills?: RiotKill[];
  damage?: RiotDamageEvent[];
  economy?: RiotEconomy;
  ability?: RiotRoundAbility;
  abilityCasts?: RiotPlayerAbilityCasts;
  score?: number;
}

export interface RiotRoundResult {
  roundNum?: number;
  winningTeam?: string;
  winningTeamRole?: string;
  bombPlanter?: string;
  bombDefuser?: string;
  playerStats?: RiotRoundPlayerStats[];
}

export interface RiotMatchInfo {
  matchId?: string;
  isCompleted?: boolean;
  isRanked?: boolean;
}

export interface RiotMatchPayload {
  matchInfo?: RiotMatchInfo;
  players?: RiotPlayer[];
  teams?: RiotTeam[];
  roundResults?: RiotRoundResult[];
}

export interface PreparedAnalysisInput {
  player: PlayerPayload;
  overview: OverviewPayload;
  sections: SectionPayload[];
}
