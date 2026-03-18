import {
  AppError,
  extractErrorMessage,
  getEnv,
  getIntEnv,
  logDev,
  requestJson,
  requireEnv
} from "@/src/server/shared";
import type {
  AnalysisClient,
  FinalAnalysisClientInput,
  FinalAnalysisResult,
  ThemeAnalysisClientInput,
  ThemeAnalysisResult
} from "@/src/server/analysis/types";

const DEFAULT_GEMINI_ANALYSIS_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_ANALYSIS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_TIMEOUT_SECONDS = 30;

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/g, "");
}

function buildGenerateContentUrl(endpoint: string, model: string): string {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const normalizedModel = model.trim();
  if (!normalizedModel) {
    throw new AppError("Gemini 모델명이 비어 있습니다.");
  }
  return `${normalizedEndpoint}/${encodeURIComponent(normalizedModel)}:generateContent`;
}

function extractCandidateText(responseBody: Record<string, unknown>): string {
  const candidates = Array.isArray(responseBody.candidates) ? responseBody.candidates : [];
  const textParts: string[] = [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== "object") {
      continue;
    }

    const parts = (content as Record<string, unknown>).parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) {
        textParts.push(text.trim());
      }
    }
  }

  const combined = textParts.join("\n").trim();
  if (combined) {
    return combined;
  }

  const promptFeedback = responseBody.promptFeedback;
  if (promptFeedback && typeof promptFeedback === "object") {
    const blockReason = (promptFeedback as Record<string, unknown>).blockReason;
    if (typeof blockReason === "string" && blockReason) {
      throw new AppError(`Gemini 응답이 차단되었습니다: ${blockReason}`);
    }
  }

  throw new AppError("Gemini 응답에서 텍스트를 찾지 못했습니다.");
}

function extractJsonObject(text: string): Record<string, unknown> {
  let candidate = text.trim();

  if (candidate.startsWith("```")) {
    const lines = candidate.split("\n");
    const firstLine = lines[0] ?? "";
    const lastLine = lines[lines.length - 1] ?? "";
    const bodyLines = [...lines];
    if (firstLine.startsWith("```")) {
      bodyLines.shift();
    }
    if (lastLine.trim() === "```") {
      bodyLines.pop();
    }
    candidate = bodyLines.join("\n").trim();
  }

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = candidate.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(slice);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }

  throw new AppError("Gemini JSON 응답을 파싱하지 못했습니다.");
}

function readThemeResultFromJson(value: Record<string, unknown>): ThemeAnalysisResult {
  const headline = typeof value.headline === "string" ? value.headline.trim() : "";
  const analysisParagraph =
    typeof value.analysisParagraph === "string"
      ? value.analysisParagraph.trim()
      : typeof value.summary === "string"
        ? value.summary.trim()
        : "";

  if (!headline || !analysisParagraph) {
    throw new AppError("Gemini 테마 응답 스키마가 올바르지 않습니다.");
  }

  return {
    headline,
    analysisParagraph
  };
}

function readFinalResultFromJson(value: Record<string, unknown>): FinalAnalysisResult {
  const headline = typeof value.headline === "string" ? value.headline.trim() : "";
  const analysisParagraph =
    typeof value.analysisParagraph === "string"
      ? value.analysisParagraph.trim()
      : typeof value.playstyle === "string"
        ? value.playstyle.trim()
        : "";

  if (!headline || !analysisParagraph) {
    throw new AppError("Gemini 최종 응답 스키마가 올바르지 않습니다.");
  }

  return {
    headline,
    analysisParagraph
  };
}

function readGeminiModel(): string {
  return getEnv("LLM_ANALYSIS_MODEL", getEnv("GEMINI_MODEL", DEFAULT_GEMINI_ANALYSIS_MODEL));
}

export class RealGeminiAnalysisClient implements AnalysisClient {
  readonly kind = "real" as const;

  private ensureConfig(): { apiKey: string; model: string; endpoint: string; timeoutSeconds: number } {
    return {
      apiKey: requireEnv("GEMINI_API_KEY"),
      model: readGeminiModel(),
      endpoint: getEnv("GEMINI_ANALYSIS_ENDPOINT", DEFAULT_GEMINI_ANALYSIS_ENDPOINT),
      timeoutSeconds: Math.max(5, getIntEnv("GEMINI_TIMEOUT_SECONDS", DEFAULT_GEMINI_TIMEOUT_SECONDS))
    };
  }

  private async generateJsonObject(input: { prompt: string; model?: string }): Promise<Record<string, unknown>> {
    const config = this.ensureConfig();
    const model = input.model?.trim() || config.model;
    const url = buildGenerateContentUrl(config.endpoint, model);

    logDev(`[analysis-real] Gemini 호출 model=${model}`);
    const { statusCode, body } = await requestJson<Record<string, unknown>>(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": config.apiKey
      },
      timeoutSeconds: config.timeoutSeconds,
      payload: {
        contents: [
          {
            role: "user",
            parts: [{ text: input.prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4
        }
      }
    });

    if (statusCode !== 200) {
      const detail = extractErrorMessage(body);
      throw new AppError(`Gemini 분석 호출이 실패했습니다. (${statusCode}: ${detail})`);
    }

    const text = extractCandidateText(body);
    return extractJsonObject(text);
  }

  async analyzeTheme(input: ThemeAnalysisClientInput): Promise<ThemeAnalysisResult> {
    const parsed = await this.generateJsonObject({
      prompt: input.prompt,
      model: input.model
    });
    return readThemeResultFromJson(parsed);
  }

  async analyzeFinalSummary(input: FinalAnalysisClientInput): Promise<FinalAnalysisResult> {
    const parsed = await this.generateJsonObject({
      prompt: input.prompt,
      model: input.model
    });
    return readFinalResultFromJson(parsed);
  }
}
