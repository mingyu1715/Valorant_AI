import type {
  AnalysisClient,
  FinalAnalysisClientInput,
  FinalAnalysisResult,
  ThemeAnalysisClientInput,
  ThemeAnalysisResult
} from "@/src/server/analysis/types";

function toThemeTitle(theme: ThemeAnalysisClientInput["theme"], lang: ThemeAnalysisClientInput["lang"]): string {
  if (theme === "combat") {
    return lang === "en" ? "Combat" : "교전";
  }
  if (theme === "economy") {
    return lang === "en" ? "Economy" : "경제";
  }
  return lang === "en" ? "Context" : "운영";
}

function toThemeMetrics(match: ThemeAnalysisClientInput["featurePayload"]["matches"][number], theme: ThemeAnalysisClientInput["theme"]): Record<string, number> {
  const source =
    theme === "combat" && "combat" in match
      ? match.combat
      : theme === "economy" && "economy" in match
        ? match.economy
        : "context" in match
          ? match.context
          : {};
  const metrics: Record<string, number> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      metrics[key] = value;
    }
  }
  return metrics;
}

function getAveragedThemeMetrics(input: ThemeAnalysisClientInput): Array<[string, number]> {
  const accumulator = new Map<string, { sum: number; count: number }>();

  for (const match of input.featurePayload.matches) {
    const metricMap = toThemeMetrics(match, input.theme);
    for (const [key, value] of Object.entries(metricMap)) {
      const current = accumulator.get(key) ?? { sum: 0, count: 0 };
      current.sum += value;
      current.count += 1;
      accumulator.set(key, current);
    }
  }

  return [...accumulator.entries()]
    .map(([key, value]) => [key, value.count > 0 ? value.sum / value.count : 0] as [string, number])
    .sort((left, right) => right[1] - left[1]);
}

function toMetricSentence(key: string, value: number): string {
  const percentLike = key.toLowerCase().includes("rate") || key.toLowerCase().includes("percent");
  if (percentLike) {
    return `${key} ${(value * 100).toFixed(1)}%`;
  }
  return `${key} ${value.toFixed(3)}`;
}

function buildDeterministicThemeResult(input: ThemeAnalysisClientInput): ThemeAnalysisResult {
  const themeTitle = toThemeTitle(input.theme, input.lang);
  const averagedMetrics = getAveragedThemeMetrics(input);
  const strongest = averagedMetrics[0];
  const weakest = averagedMetrics[averagedMetrics.length - 1];
  const strongestText = strongest
    ? input.lang === "en"
      ? `${toMetricSentence(strongest[0], strongest[1])} is relatively strong`
      : `${toMetricSentence(strongest[0], strongest[1])} 지표가 상대적으로 높게 나타나는 흐름이 보입니다`
    : input.lang === "en"
      ? `${themeTitle} metrics show a generally stable trend`
      : `${themeTitle} 지표의 평균 흐름이 안정적으로 보입니다`;
  const weakestText = weakest
    ? input.lang === "en"
      ? `${toMetricSentence(weakest[0], weakest[1])} is relatively weak in some segments`
      : `${toMetricSentence(weakest[0], weakest[1])} 지표가 낮게 나타나는 구간이 함께 관찰됩니다`
    : input.lang === "en"
      ? `variation appears across ${themeTitle} metrics`
      : `${themeTitle} 지표에서 변동 구간이 함께 관찰됩니다`;
  const sampleMatches = input.featurePayload.matches.length;

  return {
    headline:
      input.lang === "en"
        ? `${themeTitle} interpretation pattern.`
        : `${themeTitle} 테마 해석 패턴입니다.`,
    analysisParagraph:
      input.lang === "en"
        ? `Based on the latest ${sampleMatches} matches, ${themeTitle} trends indicate that ${strongestText}. At the same time, ${weakestText}. It is worth monitoring repeated deviations from baseline averages.`
        : `최근 ${sampleMatches}경기 기준으로 ${themeTitle} 흐름을 보면 ${strongestText}. 동시에 ${weakestText}. 평균 기준과의 편차가 반복되는 구간을 함께 확인할 필요가 있어 보입니다.`
  };
}

function buildDeterministicFinalResult(input: FinalAnalysisClientInput): FinalAnalysisResult {
  const { playerSummary } = input;
  return {
    headline: input.lang === "en" ? "Overall playstyle interpretation pattern." : "플레이 스타일 종합 해석 패턴입니다.",
    analysisParagraph:
      input.lang === "en"
        ? `Based on recent samples, average KD ${playerSummary.avgKD.toFixed(2)}, average ACS ${playerSummary.avgACS.toFixed(1)}, and win rate ${(playerSummary.winRate * 100).toFixed(1)}% indicate a recognizable trend. Across combat, economy, and context themes, segment-level deviations are observed and should be monitored against baseline metrics.`
        : `최근 표본 기준으로 평균 KD ${playerSummary.avgKD.toFixed(2)}, 평균 ACS ${playerSummary.avgACS.toFixed(1)}, 승률 ${(playerSummary.winRate * 100).toFixed(1)}% 흐름이 나타나는 편입니다. 교전, 경제, 운영 테마를 함께 보면 구간별 편차가 관찰되며, 평균 지표 대비 변동 구간을 이어서 확인할 필요가 있어 보입니다.`
  };
}

export class MockGeminiAnalysisClient implements AnalysisClient {
  readonly kind = "mock" as const;

  async analyzeTheme(input: ThemeAnalysisClientInput): Promise<ThemeAnalysisResult> {
    return buildDeterministicThemeResult(input);
  }

  async analyzeFinalSummary(input: FinalAnalysisClientInput): Promise<FinalAnalysisResult> {
    return buildDeterministicFinalResult(input);
  }
}
