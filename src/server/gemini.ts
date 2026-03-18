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

const DEFAULT_GEMINI_PROMPT_ATTEMPTS = 2;
const SECTION_RETRY_HINTS: Record<SectionPayload["key"], string> = {
  attack_defense: "공격/수비를 분리해 원인을 설명하고, 첫 교전-트레이드-재배치 루틴을 행동으로 제시하세요.",
  economy: "구매 단계별(이코/하프바이/풀바이) 기준을 명시하고 크레딧 임계값과 장비 우선순위를 포함하세요.",
  clutch: "1vN에서 시간 기준, 피크 순서, 유틸 보존/사용 조건을 수치 기준으로 제시하세요.",
  utility: "스킬 사용 전후 체크포인트와 연계 타이밍을 포함해 라운드 전환 기준을 제시하세요."
};
const SECTION_ACTION_KEYWORDS: Record<SectionPayload["key"], string[]> = {
  attack_defense: ["공격", "수비", "첫 교전", "트레이드", "포지션", "재배치", "로테이션", "엔트리"],
  economy: ["크레딧", "구매", "이코", "하프바이", "풀바이", "저축", "드랍", "장비"],
  clutch: ["1v", "시간", "피크", "각", "포스트플랜트", "디퓨즈", "유틸", "순서"],
  utility: ["스킬", "유틸", "진입", "리테이크", "연계", "시야", "체크", "타이밍"]
};

function buildBulletLines(lines: string[], fallbackText: string): string {
  const normalized = lines.map((line) => line.trim()).filter(Boolean);
  if (!normalized.length) {
    return `- ${fallbackText}`;
  }
  return normalized.map((line) => `- ${line}`).join("\n");
}

function buildPromptSharedContext(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload
): string {
  const overviewLines = buildBulletLines(overview.facts, "전체 개요 데이터가 없습니다.");
  const sectionLines = buildBulletLines(section.facts, "섹션 핵심 사실 데이터가 없습니다.");
  const overviewRaw = overview.raw
    ? `- 분석 매치 수: ${overview.raw.matchesAnalyzed}
- 매치 승률: ${(overview.raw.matchWinRate * 100).toFixed(1)}%
- 평균 ACS: ${overview.raw.acs.toFixed(1)}
- KDA 비율: ${overview.raw.kdaRatio.toFixed(2)}`
    : "- overview.raw 데이터 없음";

  return `
[플레이어]
${player.riotId}#${player.riotTag}

[전체 개요 수치]
${overviewRaw}

[전체 개요]
${overviewLines}

[이번 섹션 핵심 사실]
${sectionLines}

[이번 섹션 상세 JSON]
${JSON.stringify(section.raw, null, 2)}
`.trim();
}

function buildPromptOutputContract(retryReason: string): string {
  return `
[출력 형식]
반드시 JSON 객체 하나만 출력하고, 다른 텍스트를 절대 추가하지 마라.
{
  "headline": "12~30자 한 줄 진단",
  "summary": "2~3문장. 원인 중심 요약",
  "actions": [
    "행동 교정 1",
    "행동 교정 2",
    "행동 교정 3"
  ]
}

[공통 규칙]
- markdown 금지
- 코드펜스 금지
- 모든 값은 한국어
- actions는 정확히 3개
- 각 action은 반드시 1문장, 명령형, 즉시 실행 가능
- 각 action에 상황/트리거 + 실제 행동 + 측정 기준 + 점검 지표 포함
- 추상 조언 금지: "집중", "멘탈", "신경 써라" 단독 문장 금지

${retryReason ? `[재요청 사유]\n${retryReason}` : ""}
`.trim();
}

function buildAttackDefensePrompt(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload,
  retryReason = ""
): string {
  const focus = SECTION_CONFIGS.find((item) => item.key === section.key)?.focus ?? "";
  return `
너는 발로란트 전술코치 중 "공/수 라운드 운영" 담당이다.
이번 작업은 "${section.title}" 전용 리뷰다.
${focus}

핵심 목표:
- 공격/수비의 성능 차이를 분리 진단한다.
- 첫 교전, 트레이드, 재배치 실패 패턴을 찾아 행동 교정을 제시한다.

[전용 진단 프레임]
- 공격: 첫 25초 정보 수집 -> 진입 타이밍 -> 트레이드 간격
- 수비: 초반 포지션 -> 첫 교전 손실 후 재배치 -> 사이트 유지/리테이크 판단
- 원인을 "포지셔닝/타이밍/의사결정"으로 구분해 요약한다.

[행동 교정 우선순위]
- action 1: 공격 운영 루틴 교정
- action 2: 수비 운영 루틴 교정
- action 3: 첫 교전/트레이드 공통 루틴 교정

${buildPromptOutputContract(retryReason)}

[데이터 컨텍스트]
${buildPromptSharedContext(player, overview, section)}
`.trim();
}

function buildEconomyPrompt(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload,
  retryReason = ""
): string {
  const focus = SECTION_CONFIGS.find((item) => item.key === section.key)?.focus ?? "";
  return `
너는 발로란트 팀의 "경제/구매 플랜" 코치다.
이번 작업은 "${section.title}" 전용 리뷰다.
${focus}

핵심 목표:
- 구매 라운드 구간(피스톨/이코/하프바이/풀바이)별 손실 원인을 찾는다.
- 크레딧/장비가치 대비 승률이 낮은 구간의 의사결정 규칙을 교정한다.

[전용 진단 프레임]
- 어떤 구매 구간에서 기대 승률 대비 손실이 큰지 우선순위를 정한다.
- 팀 장비가치, 개인 퍼포먼스, 라운드 전환 실패 시점을 연결해 원인을 설명한다.
- "무기 유지 vs 강제 구매 vs 저축" 기준이 불명확한 지점을 찾아낸다.

[행동 교정 우선순위]
- action 1: 피스톨/초반 경제 루틴
- action 2: 하프바이/풀바이 기준 교정
- action 3: 패배 직후 리셋/드랍 콜 규칙 교정

[필수 제약]
- action 문장에 크레딧 임계값 또는 구매 조건을 포함하라.

${buildPromptOutputContract(retryReason)}

[데이터 컨텍스트]
${buildPromptSharedContext(player, overview, section)}
`.trim();
}

function buildClutchPrompt(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload,
  retryReason = ""
): string {
  const focus = SECTION_CONFIGS.find((item) => item.key === section.key)?.focus ?? "";
  return `
너는 발로란트 팀의 "클러치/라운드 종료 의사결정" 코치다.
이번 작업은 "${section.title}" 전용 리뷰다.
${focus}

핵심 목표:
- 1vN 상황에서 라운드 승률이 깨지는 의사결정 패턴을 찾는다.
- 시간 관리, 피크 순서, 유틸 보존 실패를 행동 단위로 교정한다.

[전용 진단 프레임]
- 클러치 실패를 시간 축(초반/중반/종반)으로 분해해 원인을 설명한다.
- 불리한 교전 강요, 정보 없이 피크, 디퓨즈/포스트플랜트 판단 오류를 분리한다.
- 멘탈 코멘트는 금지하고 라운드 내 루틴으로만 기술한다.

[행동 교정 우선순위]
- action 1: 시간 관리 루틴
- action 2: 피크 순서/각 분리 루틴
- action 3: 유틸 보존/사용 기준 루틴

[필수 제약]
- action 문장에 시간 기준(초/분), 시도 횟수, 성공률 목표 중 하나 이상 포함.

${buildPromptOutputContract(retryReason)}

[데이터 컨텍스트]
${buildPromptSharedContext(player, overview, section)}
`.trim();
}

function buildUtilityPrompt(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload,
  retryReason = ""
): string {
  const focus = SECTION_CONFIGS.find((item) => item.key === section.key)?.focus ?? "";
  return `
너는 발로란트 팀의 "유틸리티 가치 전환" 코치다.
이번 작업은 "${section.title}" 전용 리뷰다.
${focus}

핵심 목표:
- 스킬 사용량 대비 라운드 영향력이 낮은 원인을 찾아낸다.
- 진입/수비/리테이크에서 스킬 연계 타이밍을 행동으로 교정한다.

[전용 진단 프레임]
- 스킬 사용량과 효과 라운드 비율의 괴리를 먼저 설명한다.
- 단독 스킬 낭비, 팀 연계 타이밍 미스, 정보 없는 사용을 분리한다.
- "사용 전 체크 -> 사용 시점 -> 사용 후 교전 전환" 흐름으로 원인을 정리한다.

[행동 교정 우선순위]
- action 1: 진입 전 유틸 체크리스트
- action 2: 교전 직전/직후 유틸 연계 루틴
- action 3: 리테이크/사이트 방어 유틸 운영 루틴

[필수 제약]
- action 문장에 스킬 사용 트리거(예: 미니맵 정보, 팀 콜, 적 접촉)를 포함.

${buildPromptOutputContract(retryReason)}

[데이터 컨텍스트]
${buildPromptSharedContext(player, overview, section)}
`.trim();
}

function buildSectionPrompt(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload,
  retryReason = ""
): string {
  if (section.key === "attack_defense") {
    return buildAttackDefensePrompt(player, overview, section, retryReason);
  }
  if (section.key === "economy") {
    return buildEconomyPrompt(player, overview, section, retryReason);
  }
  if (section.key === "clutch") {
    return buildClutchPrompt(player, overview, section, retryReason);
  }
  return buildUtilityPrompt(player, overview, section, retryReason);
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
  const sanitize = (text: string) =>
    text
      .replace(/^\d+[\.)]\s*/, "")
      .replace(/^[-•]\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

  if (Array.isArray(value)) {
    const items = value.map((item) => sanitize(String(item))).filter(Boolean);
    if (items.length) {
      return items;
    }
  }

  if (typeof value === "string") {
    const items = value
      .split("\n")
      .map((line) => sanitize(line))
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }

  return [];
}

function normalizeSectionAnalysisPayload(rawPayload: Record<string, unknown>, fallbackTitle: string): SectionAnalysis {
  const headline = String(rawPayload.headline ?? rawPayload.title ?? fallbackTitle).replace(/\s+/g, " ").trim();
  const summary = String(rawPayload.summary ?? rawPayload.analysis ?? "").replace(/\s+/g, " ").trim();
  const actions = [...new Set(normalizeAnalysisItems(rawPayload.actions ?? rawPayload.feedback ?? rawPayload.actionItems))];

  while (actions.length < 3) {
    actions.push(`${fallbackTitle} 지표를 기준으로 5경기 동안 라운드별 판단 로그를 기록하고 교정하세요.`);
  }

  return {
    headline,
    summary: summary || "요약이 비어 있습니다.",
    actions: actions.slice(0, 3)
  };
}

function scoreAnalysisQuality(analysis: SectionAnalysis, sectionKey: SectionPayload["key"]): number {
  let score = 0;
  if (analysis.headline.length >= 8) {
    score += 1;
  }
  if (analysis.summary.length >= 35) {
    score += 1;
  }
  if (analysis.actions.length === 3) {
    score += 1;
  }
  const actionableCount = analysis.actions.filter(
    (action) => action.length >= 18 && (/\d/.test(action) || /(라운드|경기|회|번|초|분|성공률|비율)/.test(action))
  ).length;
  if (actionableCount >= 2) {
    score += 1;
  }
  const relevantCount = analysis.actions.filter((action) =>
    SECTION_ACTION_KEYWORDS[sectionKey].some((keyword) => action.includes(keyword))
  ).length;
  if (relevantCount >= 2) {
    score += 1;
  }
  return score;
}

export async function analyzeSectionWithGemini(
  player: { riotId: string; riotTag: string },
  overview: OverviewPayload,
  section: SectionPayload
): Promise<SectionAnalysis> {
  const geminiApiKey = requireEnv("GEMINI_API_KEY");
  const modelName = getEnv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL);
  const timeoutSeconds = getIntEnv("GEMINI_TIMEOUT_SECONDS", DEFAULT_GEMINI_TIMEOUT_SECONDS);
  const maxAttempts = Math.max(1, Math.min(3, getIntEnv("GEMINI_PROMPT_ATTEMPTS", DEFAULT_GEMINI_PROMPT_ATTEMPTS)));
  const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  let retryReason = "";
  let bestAnalysis: SectionAnalysis | null = null;
  let bestScore = -1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      logDev(`Gemini ${section.key} 요청 시작 (attempt ${attempt}/${maxAttempts})`);
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
                  text: buildSectionPrompt(player, overview, section, retryReason)
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.25,
            topP: 0.9
          }
        },
        timeoutSeconds
      });

      if (statusCode !== 200) {
        throw new AppError(`Gemini API 호출 실패: ${statusCode} (${extractErrorMessage(body)})`);
      }

      const rawText = extractGeminiText(body);
      const normalized = normalizeSectionAnalysisPayload(extractJsonObject(rawText), section.title);
      const quality = scoreAnalysisQuality(normalized, section.key);

      if (quality > bestScore) {
        bestScore = quality;
        bestAnalysis = normalized;
      }

      if (quality >= 3) {
        logDev(`Gemini ${section.key} 요청 완료 (attempt ${attempt}/${maxAttempts}, quality=${quality})`);
        return normalized;
      }

      retryReason = `이전 응답의 구체성/관련성이 부족했습니다. ${SECTION_RETRY_HINTS[section.key]}`;
      logDev(`Gemini ${section.key} 재시도 예정 (attempt ${attempt}/${maxAttempts}, quality=${quality})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryReason =
        "이전 응답이 JSON 형식 규칙을 만족하지 못했습니다. JSON 객체 하나만 출력하고 markdown/코드펜스/부가 텍스트를 제거하세요.";
      logDev(`Gemini ${section.key} 재시도 예정 (attempt ${attempt}/${maxAttempts}, error)`);
    }
  }

  if (bestAnalysis) {
    logDev(`Gemini ${section.key} 요청 완료 (fallback quality=${bestScore})`);
    return bestAnalysis;
  }

  throw new AppError(lastError?.message ?? "Gemini 분석에 실패했습니다.");
}
