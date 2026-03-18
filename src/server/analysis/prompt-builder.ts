import type { PlayerSummaryAnalysisInput, ThemeAnalysisInputPayload } from "@/src/server/analysis-input/types";
import type { ThemeAnalysisResultMap } from "@/src/server/analysis/types";

export const ANALYSIS_PROMPT_VERSION = "analysis-prompt-v5";

const COMMON_GUARDRAILS = [
  "보이지 않는 사실(에임 습관, 멘탈 상태, 팀 보이스 등)을 단정하지 말 것",
  "행동 처방보다 패턴 진단/방향 제시에 집중할 것",
  "숫자만 나열하지 말고 의미를 중심으로 설명할 것",
  "표본이 적으면 과신하지 말고 불확실성을 반영할 것",
  "구체적인 훈련 방법이나 명령형 지시를 쓰지 말 것",
  "JSON 객체 하나만 출력하고 다른 텍스트를 추가하지 말 것"
] as const;

const TONE_STYLE_RULES = [
  "분석 리포트 톤의 자연스러운 설명 문장으로 작성할 것",
  "analysisParagraph는 하나의 자연스러운 문단(2~4문장)으로 작성하고 줄바꿈을 넣지 말 것",
  "문장은 서로 이어지게 작성하고 같은 구조를 반복하지 말 것",
  '문장은 가급적 "~패턴입니다", "~경향이 있습니다", "~보입니다", "~가능성이 있습니다", "~필요해 보입니다" 계열로 마무리할 것',
  "감성적 표현, 캐릭터화, 과장된 비유를 사용하지 말 것",
  "너무 건조한 로그 나열 문장(firstKillRate 낮음 등)으로 작성하지 말 것"
] as const;

const TONE_STYLE_EXAMPLE =
  "교전 참여 비중은 높은 편이지만 먼저 사망하는 경우도 함께 많아 라운드 초반에 전력이 줄어드는 흐름이 자주 나타납니다. 특히 교전에 빠르게 관여하는 대신 오래 살아남는 비율이 낮아 이후 상황으로 연결되지 않는 경우가 있는 편입니다. 교전 타이밍에서의 안정성이 조금만 높아져도 생존 시간이 길어지면서 라운드 전체 기여도가 더 좋아질 가능성이 있습니다.";

const FORBIDDEN_EXPRESSIONS = [
  "집행자",
  "마침표를 찍는",
  "냉철한",
  "폭발적인",
  "압도적인",
  "완벽한",
  "탁월한",
  "뛰어난",
  "문제입니다",
  "잘못입니다",
  "필수입니다",
  "반드시",
  "해야 합니다",
  "훈련이 필요합니다"
] as const;

const PRIORITY_METRIC_RULES = [
  "다음 핵심 지표를 우선 반영할 것: kd, acs, kast, hsPercent, adr, dda, firstKills, firstDeaths",
  "핵심 지표는 단순 나열하지 말고 경기 흐름과 함께 해석할 것"
] as const;

function asJsonBlock(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildThemeAnalysisPrompt(featurePayload: ThemeAnalysisInputPayload): string {
  return [
    `promptVersion=${ANALYSIS_PROMPT_VERSION}`,
    "당신은 VALORANT 플레이 스타일 분석가다.",
    "",
    "[출력 스키마]",
    "{",
    '  "headline": "string",',
    '  "analysisParagraph": "string (하나의 자연스러운 문단)"',
    "}",
    "",
    "[제약]",
    ...COMMON_GUARDRAILS.map((rule, index) => `${index + 1}. ${rule}`),
    ...PRIORITY_METRIC_RULES.map((rule, index) => `${COMMON_GUARDRAILS.length + index + 1}. ${rule}`),
    "",
    "[문장 톤 규칙]",
    ...TONE_STYLE_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    `예시: ${TONE_STYLE_EXAMPLE}`,
    "",
    "[금지 표현]",
    ...FORBIDDEN_EXPRESSIONS.map((expression, index) => `${index + 1}. ${expression}`),
    "",
    "[입력 feature payload]",
    asJsonBlock(featurePayload)
  ].join("\n");
}

export function buildFinalSummaryPrompt(input: {
  playerSummary: PlayerSummaryAnalysisInput;
  themeAnalyses: ThemeAnalysisResultMap;
}): string {
  return [
    `promptVersion=${ANALYSIS_PROMPT_VERSION}`,
    "당신은 VALORANT 분석 리포트의 최종 종합 요약 작성자다.",
    "",
    "[출력 스키마]",
    "{",
    '  "headline": "string",',
    '  "analysisParagraph": "string (하나의 자연스러운 문단)"',
    "}",
    "",
    "[제약]",
    ...COMMON_GUARDRAILS.map((rule, index) => `${index + 1}. ${rule}`),
    ...PRIORITY_METRIC_RULES.map((rule, index) => `${COMMON_GUARDRAILS.length + index + 1}. ${rule}`),
    "",
    "[문장 톤 규칙]",
    ...TONE_STYLE_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    `예시: ${TONE_STYLE_EXAMPLE}`,
    "",
    "[금지 표현]",
    ...FORBIDDEN_EXPRESSIONS.map((expression, index) => `${index + 1}. ${expression}`),
    "",
    "[입력 player summary]",
    asJsonBlock(input.playerSummary),
    "",
    "[입력 theme analyses]",
    asJsonBlock(input.themeAnalyses)
  ].join("\n");
}
