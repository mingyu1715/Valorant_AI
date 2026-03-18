import { createHash } from "node:crypto";

import { getIntEnv } from "@/src/server/shared";
import type { AnalysisThemeKey } from "@/src/server/analysis-input/types";

const DEFAULT_ANALYSIS_CACHE_TTL_SECONDS = 60 * 60 * 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function hashValue(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function getAnalysisCacheTtlSeconds(): number {
  return Math.max(60, getIntEnv("LLM_ANALYSIS_CACHE_TTL_SECONDS", DEFAULT_ANALYSIS_CACHE_TTL_SECONDS));
}

export function buildPromptHash(prompt: string): string {
  return hashValue(prompt);
}

export function buildAnalysisCacheKey(input: {
  scope: "theme" | "final";
  puuid: string;
  window: string;
  version: string;
  model: string;
  theme?: AnalysisThemeKey;
  payload: unknown;
  prompt: string;
}): {
  cacheKey: string;
  promptHash: string;
  payloadHash: string;
} {
  const promptHash = buildPromptHash(input.prompt);
  const payloadHash = hashValue(stableStringify(input.payload));

  const namespaceParts = [
    "llm-analysis-v1",
    input.scope,
    input.puuid,
    input.window || "default-window",
    input.version || "default-version",
    input.model || "default-model",
    input.theme || "all",
    payloadHash.slice(0, 24),
    promptHash.slice(0, 24)
  ];

  return {
    cacheKey: namespaceParts.join(":"),
    promptHash,
    payloadHash
  };
}
