import { buildThemeAnalysisInputPayloadMap } from "@/src/server/analysis-input/builder";
import type { AnalysisThemeKey, PlayerAnalysisInput, ThemeAnalysisInputPayload } from "@/src/server/analysis-input/types";
import { analysisRepository } from "@/src/server/db/repositories";
import { DEFAULT_GEMINI_MODEL, getEnv } from "@/src/server/shared";
import type { SerializableJsonValue } from "@/src/server/types";
import { buildAnalysisCacheKey, getAnalysisCacheTtlSeconds } from "@/src/server/analysis/cache";
import { getAnalysisClient } from "@/src/server/analysis/client";
import {
  ANALYSIS_PROMPT_VERSION,
  buildFinalSummaryPrompt,
  buildThemeAnalysisPrompt
} from "@/src/server/analysis/prompt-builder";
import type {
  AnalysisClient,
  AnalysisResultBundle,
  FinalAnalysisResult,
  GenerateAnalysisInput,
  ThemeAnalysisResult,
  ThemeAnalysisResultMap
} from "@/src/server/analysis/types";

const THEME_KEYS: AnalysisThemeKey[] = ["combat", "economy", "context"];
const REPORT_TONE_ENDINGS = [
  "패턴입니다",
  "경향이 있습니다",
  "보입니다",
  "가능성이 있습니다",
  "필요해 보입니다"
] as const;

const FORBIDDEN_TONE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/집행자/g, "플레이어"],
  [/마침표를 찍는/g, "마무리하는"],
  [/냉철한/g, "안정적인"],
  [/폭발적인/g, "높은"],
  [/압도적인/g, "높은"],
  [/완벽한/g, "안정적인"],
  [/탁월한/g, "양호한"],
  [/뛰어난/g, "양호한"],
  [/문제입니다/g, "관찰됩니다"],
  [/잘못입니다/g, "개선 여지가 있어 보입니다"],
  [/필수입니다/g, "필요해 보입니다"],
  [/반드시/g, "우선"],
  [/해야 합니다/g, "필요해 보입니다"],
  [/훈련이 필요합니다/g, "반복 점검이 필요해 보입니다"]
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPrismaJsonValue(value: unknown): SerializableJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as SerializableJsonValue;
}

function getConfiguredAnalysisModel(): string {
  return getEnv("LLM_ANALYSIS_MODEL", getEnv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL));
}

function sanitizeForbiddenTone(text: string): string {
  let normalized = text;
  for (const [pattern, replacement] of FORBIDDEN_TONE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

function ensureReportToneSentence(text: string, fallback: string): string {
  const raw = sanitizeForbiddenTone((text || "").trim());
  const base = raw || fallback;
  const collapsed = base.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return fallback;
  }
  const withoutPunctuation = collapsed.replace(/[.!?]+$/g, "").trim();
  if (!withoutPunctuation) {
    return fallback;
  }

  if (REPORT_TONE_ENDINGS.some((ending) => withoutPunctuation.endsWith(ending))) {
    return `${withoutPunctuation}.`;
  }

  return `${withoutPunctuation} 경향이 있습니다.`;
}

function ensureReportToneParagraph(text: string, fallback: string): string {
  const raw = sanitizeForbiddenTone((text || "").trim());
  const base = raw || fallback;
  const collapsed = base
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!collapsed) {
    return fallback;
  }

  let paragraph = collapsed;
  if (!/[.!?]$/.test(paragraph)) {
    paragraph = `${paragraph}.`;
  }

  if (!REPORT_TONE_ENDINGS.some((ending) => paragraph.includes(ending))) {
    paragraph = paragraph.replace(/[.!?]+$/g, "").trim();
    paragraph = `${paragraph} 경향이 있습니다.`;
  }

  return paragraph;
}

function normalizeThemeAnalysisResult(value: ThemeAnalysisResult): ThemeAnalysisResult {
  const headline = ensureReportToneSentence(value.headline, "테마별 지표 해석 패턴입니다.");
  const analysisParagraph = ensureReportToneParagraph(
    value.analysisParagraph,
    "입력 feature payload를 기준으로 테마별 지표 흐름이 나타나는 경향이 있습니다."
  );
  return {
    headline,
    analysisParagraph
  };
}

function normalizeFinalAnalysisResult(value: FinalAnalysisResult): FinalAnalysisResult {
  const headline = ensureReportToneSentence(value.headline, "플레이 스타일 종합 해석 패턴입니다.");
  const analysisParagraph = ensureReportToneParagraph(
    value.analysisParagraph,
    "표본 데이터 기준으로 일관된 플레이 흐름이 관찰되는 경향이 있습니다."
  );
  return {
    headline,
    analysisParagraph
  };
}

function parseThemeAnalysisResult(value: unknown): ThemeAnalysisResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const headline = typeof value.headline === "string" ? value.headline : "";
  const analysisParagraph =
    typeof value.analysisParagraph === "string"
      ? value.analysisParagraph
      : typeof value.summary === "string"
        ? value.summary
        : "";
  if (!headline || !analysisParagraph) {
    return null;
  }

  return {
    headline,
    analysisParagraph
  };
}

function parseFinalAnalysisResult(value: unknown): FinalAnalysisResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const headline = typeof value.headline === "string" ? value.headline : "";
  const analysisParagraph =
    typeof value.analysisParagraph === "string"
      ? value.analysisParagraph
      : typeof value.playstyle === "string"
        ? value.playstyle
        : "";
  if (!headline || !analysisParagraph) {
    return null;
  }

  return {
    headline,
    analysisParagraph
  };
}

function readCachedOutput(row: unknown): unknown {
  if (!isRecord(row)) {
    return null;
  }
  return row.outputJson;
}

function getCacheExpiryDate(): Date {
  return new Date(Date.now() + getAnalysisCacheTtlSeconds() * 1000);
}

interface AnalyzeThemePayloadInput {
  puuid: string;
  window: string;
  version: string;
  featurePayload: ThemeAnalysisInputPayload;
  model?: string;
  useCache?: boolean;
}

export async function analyzeThemePayload(
  input: AnalyzeThemePayloadInput,
  client: AnalysisClient = getAnalysisClient()
): Promise<ThemeAnalysisResult> {
  const model = input.model ?? getConfiguredAnalysisModel();
  const prompt = buildThemeAnalysisPrompt(input.featurePayload);
  const useCache = input.useCache !== false;
  const cacheIdentity = buildAnalysisCacheKey({
    scope: "theme",
    puuid: input.puuid,
    window: input.window,
    version: input.version,
    model,
    theme: input.featurePayload.theme,
    payload: input.featurePayload,
    prompt
  });

  if (useCache) {
    const cached = await analysisRepository.getValidAnalysisCache(cacheIdentity.cacheKey);
    const cachedOutput = readCachedOutput(cached);
    const parsedCachedOutput = parseThemeAnalysisResult(cachedOutput);
    if (parsedCachedOutput) {
      await analysisRepository.markAnalysisCacheHit(cacheIdentity.cacheKey);
      return normalizeThemeAnalysisResult(parsedCachedOutput);
    }
  }

  const generated = await client.analyzeTheme({
    theme: input.featurePayload.theme,
    featurePayload: input.featurePayload,
    prompt,
    model
  });
  const normalizedGenerated = normalizeThemeAnalysisResult(generated);

  if (useCache) {
    await analysisRepository.upsertAnalysisCache({
      cacheKey: cacheIdentity.cacheKey,
      puuid: input.puuid,
      window: input.window,
      version: input.version,
      model,
      promptHash: cacheIdentity.promptHash,
      inputJson: toPrismaJsonValue({
        scope: "theme",
        theme: input.featurePayload.theme,
        featurePayload: input.featurePayload,
        promptVersion: ANALYSIS_PROMPT_VERSION
      }),
      outputJson: toPrismaJsonValue(normalizedGenerated),
      metadataJson: toPrismaJsonValue({
        provider: client.kind,
        generatedAt: new Date().toISOString()
      }),
      expiresAt: getCacheExpiryDate()
    });
  }

  return normalizedGenerated;
}

interface AnalyzeThemePayloadSetInput {
  puuid: string;
  window: string;
  version: string;
  analysisInput: PlayerAnalysisInput;
  model?: string;
  useCache?: boolean;
}

export async function analyzeThemePayloadSet(
  input: AnalyzeThemePayloadSetInput,
  client: AnalysisClient = getAnalysisClient()
): Promise<ThemeAnalysisResultMap> {
  const themeAnalysisInputPayloadMap = buildThemeAnalysisInputPayloadMap(input.analysisInput);
  const themeAnalysisResultMap = {} as ThemeAnalysisResultMap;
  for (const theme of THEME_KEYS) {
    themeAnalysisResultMap[theme] = await analyzeThemePayload(
      {
        puuid: input.puuid,
        window: input.window,
        version: input.version,
        featurePayload: themeAnalysisInputPayloadMap[theme],
        model: input.model,
        useCache: input.useCache
      },
      client
    );
  }
  return themeAnalysisResultMap;
}

interface AnalyzeFinalSummaryInput {
  puuid: string;
  window: string;
  version: string;
  playerSummary: PlayerAnalysisInput["playerSummary"];
  themeAnalyses: ThemeAnalysisResultMap;
  model?: string;
  useCache?: boolean;
}

export async function analyzeFinalSummary(
  input: AnalyzeFinalSummaryInput,
  client: AnalysisClient = getAnalysisClient()
): Promise<FinalAnalysisResult> {
  const model = input.model ?? getConfiguredAnalysisModel();
  const prompt = buildFinalSummaryPrompt({
    playerSummary: input.playerSummary,
    themeAnalyses: input.themeAnalyses
  });
  const useCache = input.useCache !== false;
  const cachePayload = {
    playerSummary: input.playerSummary,
    themeAnalyses: input.themeAnalyses
  };
  const cacheIdentity = buildAnalysisCacheKey({
    scope: "final",
    puuid: input.puuid,
    window: input.window,
    version: input.version,
    model,
    payload: cachePayload,
    prompt
  });

  if (useCache) {
    const cached = await analysisRepository.getValidAnalysisCache(cacheIdentity.cacheKey);
    const cachedOutput = readCachedOutput(cached);
    const parsedCachedOutput = parseFinalAnalysisResult(cachedOutput);
    if (parsedCachedOutput) {
      await analysisRepository.markAnalysisCacheHit(cacheIdentity.cacheKey);
      return normalizeFinalAnalysisResult(parsedCachedOutput);
    }
  }

  const generated = await client.analyzeFinalSummary({
    playerSummary: input.playerSummary,
    themeAnalyses: input.themeAnalyses,
    prompt,
    model
  });
  const normalizedGenerated = normalizeFinalAnalysisResult(generated);

  if (useCache) {
    await analysisRepository.upsertAnalysisCache({
      cacheKey: cacheIdentity.cacheKey,
      puuid: input.puuid,
      window: input.window,
      version: input.version,
      model,
      promptHash: cacheIdentity.promptHash,
      inputJson: toPrismaJsonValue({
        scope: "final",
        payload: cachePayload,
        promptVersion: ANALYSIS_PROMPT_VERSION
      }),
      outputJson: toPrismaJsonValue(normalizedGenerated),
      metadataJson: toPrismaJsonValue({
        provider: client.kind,
        generatedAt: new Date().toISOString()
      }),
      expiresAt: getCacheExpiryDate()
    });
  }

  return normalizedGenerated;
}

export async function generateAnalysisResult(
  input: GenerateAnalysisInput,
  client: AnalysisClient = getAnalysisClient()
): Promise<AnalysisResultBundle> {
  const model = input.model ?? getConfiguredAnalysisModel();
  const themeAnalysisResultMap = await analyzeThemePayloadSet(
    {
      puuid: input.puuid,
      window: input.window,
      version: input.version,
      analysisInput: input.analysisInput,
      model,
      useCache: input.useCache
    },
    client
  );

  const finalSummary = await analyzeFinalSummary(
    {
      puuid: input.puuid,
      window: input.window,
      version: input.version,
      playerSummary: input.analysisInput.playerSummary,
      themeAnalyses: themeAnalysisResultMap,
      model,
      useCache: input.useCache
    },
    client
  );

  return {
    puuid: input.puuid,
    provider: client.kind,
    model,
    window: input.window,
    version: input.version,
    generatedAt: new Date().toISOString(),
    analysisInput: input.analysisInput,
    themeAnalyses: themeAnalysisResultMap,
    finalSummary
  };
}
