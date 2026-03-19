import type { PlayerSummaryAnalysisInput, ThemeAnalysisInputPayload } from "@/src/server/analysis-input/types";
import type { ThemeAnalysisResultMap } from "@/src/server/analysis/types";
import type { AppLanguage } from "@/src/i18n/config";

export const ANALYSIS_PROMPT_VERSION = "analysis-prompt-v6-lang";

const COMMON_GUARDRAILS = {
  ko: [
    "보이지 않는 사실(에임 습관, 멘탈 상태, 팀 보이스 등)을 단정하지 말 것",
    "행동 처방보다 패턴 진단/방향 제시에 집중할 것",
    "숫자만 나열하지 말고 의미를 중심으로 설명할 것",
    "표본이 적으면 과신하지 말고 불확실성을 반영할 것",
    "구체적인 훈련 방법이나 명령형 지시를 쓰지 말 것",
    "JSON 객체 하나만 출력하고 다른 텍스트를 추가하지 말 것"
  ],
  en: [
    "Do not assert invisible facts (aim habits, mental state, team voice, etc.)",
    "Focus on pattern diagnosis and direction, not imperative coaching commands",
    "Explain meaning, do not just list numbers",
    "Reflect uncertainty when sample size is small",
    "Do not provide detailed training drills or imperative command-style instructions",
    "Output only one JSON object and no extra text"
  ]
} as const;

const TONE_RULES = {
  ko: [
    "분석 리포트 톤의 자연스러운 설명 문장으로 작성할 것",
    "analysisParagraph는 하나의 자연스러운 문단(2~4문장)으로 작성하고 줄바꿈을 넣지 말 것",
    "문장은 서로 이어지게 작성하고 같은 구조를 반복하지 말 것"
  ],
  en: [
    "Use a natural analysis-report tone",
    "Write analysisParagraph as one natural paragraph (2-4 sentences) without line breaks",
    "Keep sentence flow connected and avoid repetitive sentence structures"
  ]
} as const;

const LANGUAGE_RULES = {
  ko: [
    "출력의 모든 설명 문장은 한국어로만 작성할 것",
    "영어 문장과 한국어 문장을 섞어 쓰지 말 것",
    "고정 라벨/고유명사 외에는 한국어를 유지할 것"
  ],
  en: [
    "All explanatory output text must be in English only",
    "Do not mix Korean and English sentences",
    "Keep fixed labels/proper nouns as-is, but all generated explanation text must be English"
  ]
} as const;

const PRIORITY_METRIC_RULES = {
  ko: [
    "다음 핵심 지표를 우선 반영할 것: kd, acs, kast, hsPercent, adr, dda, firstKills, firstDeaths",
    "핵심 지표는 단순 나열하지 말고 경기 흐름과 함께 해석할 것"
  ],
  en: [
    "Prioritize these core metrics: kd, acs, kast, hsPercent, adr, dda, firstKills, firstDeaths",
    "Interpret core metrics in gameplay context, not as a plain list"
  ]
} as const;

function asJsonBlock(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function buildHeader(lang: AppLanguage): string[] {
  return [
    `promptVersion=${ANALYSIS_PROMPT_VERSION}`,
    `lang=${lang}`,
    ""
  ];
}

function buildConstraintBlock(lang: AppLanguage): string[] {
  return [
    lang === "ko" ? "[제약]" : "[Constraints]",
    ...COMMON_GUARDRAILS[lang].map((rule, index) => `${index + 1}. ${rule}`),
    ...PRIORITY_METRIC_RULES[lang].map((rule, index) => `${COMMON_GUARDRAILS[lang].length + index + 1}. ${rule}`),
    "",
    lang === "ko" ? "[언어 출력 규칙]" : "[Language Output Rules]",
    ...LANGUAGE_RULES[lang].map((rule, index) => `${index + 1}. ${rule}`),
    "",
    lang === "ko" ? "[문장 톤 규칙]" : "[Tone Rules]",
    ...TONE_RULES[lang].map((rule, index) => `${index + 1}. ${rule}`)
  ];
}

export function buildThemeAnalysisPrompt(featurePayload: ThemeAnalysisInputPayload, lang: AppLanguage): string {
  return [
    ...buildHeader(lang),
    lang === "ko" ? "당신은 VALORANT 플레이 스타일 분석가다." : "You are a VALORANT play-style analyst.",
    "",
    lang === "ko" ? "[출력 스키마]" : "[Output Schema]",
    "{",
    '  "headline": "string",',
    '  "analysisParagraph": "string (single natural paragraph)"',
    "}",
    "",
    ...buildConstraintBlock(lang),
    "",
    lang === "ko" ? "[입력 feature payload]" : "[Input Feature Payload]",
    asJsonBlock(featurePayload)
  ].join("\n");
}

export function buildFinalSummaryPrompt(input: {
  playerSummary: PlayerSummaryAnalysisInput;
  themeAnalyses: ThemeAnalysisResultMap;
  lang: AppLanguage;
}): string {
  const { lang } = input;
  return [
    ...buildHeader(lang),
    lang === "ko" ? "당신은 VALORANT 분석 리포트의 최종 종합 요약 작성자다." : "You write final consolidated summaries for VALORANT analysis reports.",
    "",
    lang === "ko" ? "[출력 스키마]" : "[Output Schema]",
    "{",
    '  "headline": "string",',
    '  "analysisParagraph": "string (single natural paragraph)"',
    "}",
    "",
    ...buildConstraintBlock(lang),
    "",
    lang === "ko" ? "[입력 player summary]" : "[Input Player Summary]",
    asJsonBlock(input.playerSummary),
    "",
    lang === "ko" ? "[입력 theme analyses]" : "[Input Theme Analyses]",
    asJsonBlock(input.themeAnalyses)
  ].join("\n");
}
