import {
  AppError,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_TIMEOUT_SECONDS,
  SECTION_CONFIGS,
  extractErrorMessage,
  getEnv,
  getIntEnv,
  logDev,
  requestJson,
  requireEnv
} from "@/src/server/shared";
import type { OverviewPayload, SectionAnalysis, SectionPayload } from "@/src/server/types";

function buildSectionPrompt(player: { riotId: string; riotTag: string }, overview: OverviewPayload, section: SectionPayload): string {
  const overviewLines = overview.facts.map((fact) => `- ${fact}`).join("\n");
  const sectionLines = section.facts.map((fact) => `- ${fact}`).join("\n");
  const focus = SECTION_CONFIGS.find((item) => item.key === section.key)?.focus ?? "";

  return `
너는 VCT 퍼시픽 리그에서 DRX, Gen.G, T1을 상대 분석하듯 리뷰하는 1군 프로팀의 날카로운 데이터 분석 코치다.
이번에는 "${section.title}" 한 섹션만 분석한다.
${focus}

절대 통계를 그대로 읽어주지 마라.
문제 원인과 랭크 게임에서 바로 실행할 수 있는 행동 교정만 말해라.
반드시 "핵심 피드백 3가지"를 행동 단위로 도출해라.

반드시 JSON 객체 하나만 출력해.
{
  "headline": "이 섹션의 한 줄 진단",
  "summary": "2~3문장 핵심 진단",
  "actions": ["행동 교정 1", "행동 교정 2", "행동 교정 3"]
}

규칙:
- markdown 금지
- 코드펜스 금지
- 모든 값은 한국어
- actions는 정확히 3개
- 각 action은 실전에서 바로 바꿀 수 있는 구체 행동으로 써라
- 칭찬으로 길게 시작하지 마라

[플레이어]
${player.riotId}#${player.riotTag}

[전체 개요]
${overviewLines}

[이번 섹션 핵심 사실]
${sectionLines}

[이번 섹션 상세 JSON]
${JSON.stringify(section.raw, null, 2)}
`.trim();
}

function extractGeminiText(responseBody: Record<string, unknown>): string {
  const candidates = Array.isArray(responseBody.candidates) ? responseBody.candidates : [];
  const collectedText: string[] = [];

  for (const candidate of candidates) {
    const content = typeof candidate === "object" && candidate ? (candidate as Record<string, unknown>).content : undefined;
    const parts = content && typeof content === "object" ? (content as Record<string, unknown>).parts : undefined;
    if (!Array.isArray(parts)) {
      continue;
    }
    for (const part of parts) {
      if (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") {
        collectedText.push(String((part as Record<string, unknown>).text).trim());
      }
    }
  }

  const combinedText = collectedText.filter(Boolean).join("\n");
  if (combinedText) {
    return combinedText;
  }

  const promptFeedback = responseBody.promptFeedback;
  if (promptFeedback && typeof promptFeedback === "object") {
    const blockReason = (promptFeedback as Record<string, unknown>).blockReason;
    if (typeof blockReason === "string" && blockReason) {
      throw new AppError(`Gemini 응답이 차단되었습니다: ${blockReason}`);
    }
  }

  throw new AppError("Gemini 응답에서 분석 텍스트를 찾지 못했습니다.");
}

function extractJsonObject(text: string): Record<string, unknown> {
  let candidateText = text.trim();
  if (candidateText.startsWith("```")) {
    const lines = candidateText.split("\n");
    candidateText = lines.slice(1, lines.at(-1)?.trim() === "```" ? -1 : undefined).join("\n").trim();
  }

  try {
    const parsed = JSON.parse(candidateText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}

  const firstBrace = candidateText.indexOf("{");
  const lastBrace = candidateText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = candidateText.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(slice);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }

  throw new AppError("Gemini JSON 응답을 해석하지 못했습니다.");
}

function normalizeAnalysisItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    if (items.length) {
      return items;
    }
  }

  if (typeof value === "string") {
    const items = value
      .split("\n")
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }

  return [];
}

function normalizeSectionAnalysisPayload(rawPayload: Record<string, unknown>, fallbackTitle: string): SectionAnalysis {
  const headline = String(rawPayload.headline ?? rawPayload.title ?? fallbackTitle).trim();
  const summary = String(rawPayload.summary ?? rawPayload.analysis ?? "").trim();
  const actions = normalizeAnalysisItems(rawPayload.actions ?? rawPayload.feedback ?? rawPayload.actionItems);

  while (actions.length < 3) {
    actions.push("표본 대비 행동 교정 포인트를 더 구체화해 반복 점검하세요.");
  }

  return {
    headline,
    summary: summary || "요약이 비어 있습니다.",
    actions: actions.slice(0, 3)
  };
}

export async function analyzeSectionWithGemini(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload
): Promise<SectionAnalysis> {
  const geminiApiKey = requireEnv("GEMINI_API_KEY");
  const modelName = getEnv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL);
  const timeoutSeconds = getIntEnv("GEMINI_TIMEOUT_SECONDS", DEFAULT_GEMINI_TIMEOUT_SECONDS);
  const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  logDev(`Gemini ${section.key} 요청 시작`);
  const { statusCode, body } = await requestJson<Record<string, unknown>>(requestUrl, {
    method: "POST",
    headers: {
      "x-goog-api-key": geminiApiKey
    },
    payload: {
      contents: [
        {
          parts: [
            {
              text: buildSectionPrompt(player, overview, section)
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    },
    timeoutSeconds
  });

  if (statusCode !== 200) {
    throw new AppError(`Gemini API 호출 실패: ${statusCode} (${extractErrorMessage(body)})`);
  }

  const rawText = extractGeminiText(body);
  const normalized = normalizeSectionAnalysisPayload(extractJsonObject(rawText), section.title);
  logDev(`Gemini ${section.key} 요청 완료`);
  return normalized;
}
