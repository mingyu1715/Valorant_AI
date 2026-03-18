import type {
  AnalysisThemeKey,
  PlayerAnalysisInput,
  PlayerSummaryAnalysisInput,
  ThemeAnalysisInputPayload
} from "@/src/server/analysis-input/types";

export type AnalysisClientKind = "mock" | "real";

export interface ThemeAnalysisResult {
  headline: string;
  analysisParagraph: string;
}

export interface FinalAnalysisResult {
  headline: string;
  analysisParagraph: string;
}

export type ThemeAnalysisResultMap = Record<AnalysisThemeKey, ThemeAnalysisResult>;

export interface ThemeAnalysisClientInput {
  theme: AnalysisThemeKey;
  featurePayload: ThemeAnalysisInputPayload;
  prompt: string;
  model: string;
}

export interface FinalAnalysisClientInput {
  playerSummary: PlayerSummaryAnalysisInput;
  themeAnalyses: ThemeAnalysisResultMap;
  prompt: string;
  model: string;
}

export interface AnalysisClient {
  readonly kind: AnalysisClientKind;
  analyzeTheme(input: ThemeAnalysisClientInput): Promise<ThemeAnalysisResult>;
  analyzeFinalSummary(input: FinalAnalysisClientInput): Promise<FinalAnalysisResult>;
}

export interface GenerateAnalysisInput {
  puuid: string;
  window: string;
  version: string;
  analysisInput: PlayerAnalysisInput;
  model?: string;
  useCache?: boolean;
}

export interface AnalysisResultBundle {
  puuid: string;
  provider: AnalysisClientKind;
  model: string;
  window: string;
  version: string;
  generatedAt: string;
  analysisInput: PlayerAnalysisInput;
  themeAnalyses: ThemeAnalysisResultMap;
  finalSummary: FinalAnalysisResult;
}
