#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 60_000;
const THEMES = ["combat", "economy", "context"];

function parseDotEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadLocalEnvs() {
  const root = process.cwd();
  parseDotEnvFile(path.join(root, ".env.local"));
  parseDotEnvFile(path.join(root, ".env"));
}

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/+$/g, "");
}

function buildGenerateContentUrl(endpoint, model) {
  const cleanedModel = (model || "").trim();
  if (!cleanedModel) {
    throw new Error("Gemini model is empty.");
  }
  return `${normalizeEndpoint(endpoint)}/${encodeURIComponent(cleanedModel)}:generateContent`;
}

function extractCandidateText(body) {
  const candidates = Array.isArray(body?.candidates) ? body.candidates : [];
  const texts = [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }
    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        texts.push(part.text.trim());
      }
    }
  }

  const merged = texts.join("\n").trim();
  if (merged) {
    return merged;
  }

  const blockReason = body?.promptFeedback?.blockReason;
  if (typeof blockReason === "string" && blockReason) {
    throw new Error(`Gemini response blocked: ${blockReason}`);
  }

  throw new Error("Gemini response did not include candidate text.");
}

function parseJsonObjectFromText(text) {
  let candidate = text.trim();

  if (candidate.startsWith("```")) {
    const lines = candidate.split("\n");
    if (lines[0]?.startsWith("```")) {
      lines.shift();
    }
    if (lines[lines.length - 1]?.trim() === "```") {
      lines.pop();
    }
    candidate = lines.join("\n").trim();
  }

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = candidate.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(sliced);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }

  throw new Error("Failed to parse JSON object from Gemini text.");
}

function parseThemeResult(resultJson) {
  const headline = typeof resultJson?.headline === "string" ? resultJson.headline.trim() : "";
  const analysisParagraph =
    typeof resultJson?.analysisParagraph === "string"
      ? resultJson.analysisParagraph.trim()
      : typeof resultJson?.summary === "string"
        ? resultJson.summary.trim()
        : "";

  if (!headline || !analysisParagraph) {
    throw new Error(`Invalid theme response schema: ${JSON.stringify(resultJson)}`);
  }

  return { headline, analysisParagraph };
}

function parseFinalResult(resultJson) {
  const headline = typeof resultJson?.headline === "string" ? resultJson.headline.trim() : "";
  const analysisParagraph =
    typeof resultJson?.analysisParagraph === "string"
      ? resultJson.analysisParagraph.trim()
      : typeof resultJson?.playstyle === "string"
        ? resultJson.playstyle.trim()
        : "";

  if (!headline || !analysisParagraph) {
    throw new Error(`Invalid final response schema: ${JSON.stringify(resultJson)}`);
  }

  return { headline, analysisParagraph };
}

async function callGeminiJson({ apiKey, endpoint, model, prompt, timeoutMs }) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  const url = buildGenerateContentUrl(endpoint, model);
  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `Gemini HTTP ${response.status}: ${JSON.stringify(body).slice(0, 600)}`
      );
    }

    const rawText = extractCandidateText(body);
    const parsedJson = parseJsonObjectFromText(rawText);
    return {
      requestUrl: url,
      requestPayload: payload,
      rawText,
      parsedJson
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

loadLocalEnvs();

const sampleRelativePath = process.argv[2] || "temp/llm-analysis-input.sample.json";
const outputRelativePath = process.argv[3] || "temp/llm-analysis-output.real.json";
const samplePath = path.resolve(process.cwd(), sampleRelativePath);
const outputPath = path.resolve(process.cwd(), outputRelativePath);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required. Add it to .env.local.");
}

const model = process.env.LLM_ANALYSIS_MODEL || process.env.GEMINI_MODEL || DEFAULT_MODEL;
const endpoint = process.env.GEMINI_ANALYSIS_ENDPOINT || DEFAULT_ENDPOINT;
const timeoutMs = Math.max(5_000, Number(process.env.GEMINI_TIMEOUT_SECONDS || 60) * 1000) || DEFAULT_TIMEOUT_MS;

const [{ buildThemeAnalysisInputPayloadMap }, { ANALYSIS_PROMPT_VERSION, buildThemeAnalysisPrompt, buildFinalSummaryPrompt }] =
  await Promise.all([
    import("../src/server/analysis-input/builder.ts"),
    import("../src/server/analysis/prompt-builder.ts")
  ]);

const analysisInput = JSON.parse(readFileSync(samplePath, "utf8"));
const themePayloadMap = buildThemeAnalysisInputPayloadMap(analysisInput);

const themeResults = {};
const themeCalls = {};

console.log(`[test-llm-real] sample=${samplePath}`);
console.log(`[test-llm-real] model=${model}`);
console.log(`[test-llm-real] endpoint=${endpoint}`);

for (const theme of THEMES) {
  const featurePayload = themePayloadMap[theme];
  const prompt = buildThemeAnalysisPrompt(featurePayload);
  console.log(`[test-llm-real] calling theme=${theme} ...`);

  const callResult = await callGeminiJson({
    apiKey,
    endpoint,
    model,
    prompt,
    timeoutMs
  });

  const parsedResult = parseThemeResult(callResult.parsedJson);
  themeResults[theme] = parsedResult;
  themeCalls[theme] = {
    prompt,
    requestUrl: callResult.requestUrl,
    requestPayload: callResult.requestPayload,
    rawText: callResult.rawText,
    parsedResult
  };
}

const finalPrompt = buildFinalSummaryPrompt({
  playerSummary: analysisInput.playerSummary,
  themeAnalyses: themeResults
});
console.log("[test-llm-real] calling final summary ...");

const finalCall = await callGeminiJson({
  apiKey,
  endpoint,
  model,
  prompt: finalPrompt,
  timeoutMs
});
const finalResult = parseFinalResult(finalCall.parsedJson);

const output = {
  generatedAt: new Date().toISOString(),
  promptVersion: ANALYSIS_PROMPT_VERSION,
  model,
  endpoint,
  samplePath,
  outputPath,
  themeCalls,
  themeResults,
  finalPrompt,
  finalCall: {
    requestUrl: finalCall.requestUrl,
    requestPayload: finalCall.requestPayload,
    rawText: finalCall.rawText,
    parsedResult: finalResult
  },
  finalResult
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`[test-llm-real] done: ${outputPath}`);
for (const theme of THEMES) {
  const result = themeResults[theme];
  console.log(`\n[${theme}] headline: ${result.headline}`);
  console.log(`[${theme}] analysisParagraph: ${result.analysisParagraph}`);
}
console.log(`\n[final] headline: ${finalResult.headline}`);
console.log(`[final] analysisParagraph: ${finalResult.analysisParagraph}`);
