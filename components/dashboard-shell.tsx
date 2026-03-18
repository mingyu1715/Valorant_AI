"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AnalysisThemeKey } from "@/src/server/analysis-input/types";
import type { FinalAnalysisResult, ThemeAnalysisResultMap } from "@/src/server/analysis/types";
import type { ThemeFeaturePayload, ThemeFeaturePayloadMap } from "@/src/server/theme-payloads/types";
import type { AnalysisSnapshot, JobSectionPayload, SectionKey } from "@/src/server/types";

type DashboardShellProps = {
  initialRiotId: string;
  initialRiotTag: string;
  authState?: string;
  showMockPreview?: boolean;
};

type AuthSessionPayload = {
  authenticated: boolean;
  session: {
    puuid: string;
    gameName: string;
    tagLine: string;
    provider: "mock" | "real";
    expiresAt: number;
  } | null;
};

type MatchSyncResponse = {
  fetchedMatchIdsCount: number;
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
};

type FeatureSnapshotResponse = {
  ok: boolean;
  puuid: string;
  window: string;
  version: string;
  aggregate: {
    matchCount: number;
    roundCount: number;
  };
};

type ThemePayloadResponse = {
  ok: boolean;
  puuid: string;
  window: string;
  version: string;
  themeFeatures: ThemeFeaturePayloadMap;
};

type AnalysisResultResponse = {
  ok: boolean;
  analysis: {
    themeAnalyses: ThemeAnalysisResultMap;
    finalSummary: FinalAnalysisResult;
  };
};

const SECTION_TITLES: Record<SectionKey, string> = {
  attack_defense: "공수 진영 분석",
  economy: "자금 및 경제",
  clutch: "클러치 및 멘탈",
  utility: "스킬 효율성"
};

const SECTION_THEME_MAP: Record<SectionKey, AnalysisThemeKey> = {
  attack_defense: "context",
  economy: "economy",
  clutch: "context",
  utility: "combat"
};

type DashboardTabKey = SectionKey | "final_summary";

const DASHBOARD_TAB_TITLES: Record<DashboardTabKey, string> = {
  attack_defense: "공수 진영 분석",
  economy: "자금 및 경제",
  clutch: "클러치 및 멘탈",
  utility: "스킬 효율성",
  final_summary: "최종 종합"
};

const MOCK_PREVIEW_THEME_FEATURES: ThemeFeaturePayloadMap = {
  combat: {
    theme: "combat",
    sampleMatches: 10,
    sampleRounds: 230,
    confidence: "medium",
    metrics: {
      survivalRate: 0.62,
      operatorRoundShare: 0.21,
      lmgRoundShare: 0.06,
      rifleOnlyHeadshotRate: 0.31
    }
  },
  impact: {
    theme: "impact",
    sampleMatches: 10,
    sampleRounds: 230,
    confidence: "medium",
    metrics: {
      firstKillRate: 0.18,
      firstDeathRate: 0.14,
      clutchWinRate: 0.29,
      openingDelta: 0.04
    }
  },
  economy: {
    theme: "economy",
    sampleMatches: 10,
    sampleRounds: 230,
    confidence: "medium",
    metrics: {
      pistolWinRate: 0.56,
      ecoWinRate: 0.37,
      halfBuyWinRate: 0.45,
      fullBuyWinRate: 0.62,
      fullVsEcoGap: 0.25
    }
  },
  context: {
    theme: "context",
    sampleMatches: 10,
    sampleRounds: 230,
    confidence: "medium",
    metrics: {
      attackWinRate: 0.58,
      defenseWinRate: 0.52,
      attackVsDefenseGap: 0.06
    }
  }
};

const MOCK_PREVIEW_THEME_ANALYSES: ThemeAnalysisResultMap = {
  combat: {
    headline: "전투 안정성과 무기 편중이 함께 나타나는 패턴입니다.",
    analysisParagraph:
      "교전 참여 비중은 높은 편이지만 먼저 사망하는 경우도 함께 많아 라운드 초반에 전력이 줄어드는 흐름이 자주 나타납니다. 특히 교전에 빠르게 관여하는 대신 오래 살아남는 비율이 낮아 이후 상황으로 연결되지 않는 경우가 있는 편입니다. 교전 타이밍에서의 안정성이 조금만 높아져도 생존 시간이 길어지면서 라운드 전체 기여도가 더 좋아질 가능성이 있습니다."
  },
  economy: {
    headline: "풀바이 구간과 이코 구간의 편차가 나타나는 패턴입니다.",
    analysisParagraph:
      "풀바이 구간에서는 승률이 비교적 안정적으로 유지되는 흐름이 보이지만, 저투자 구간에서는 반전 확률이 낮아 라운드 편차가 함께 커지는 경향이 있습니다. 같은 표본에서도 구매 단계가 달라질 때 성과 차이가 반복되어 경제 전환 구간의 변동성이 나타나는 편입니다. 투자 단계별 기준이 조금 더 일정해지면 라운드 평균 기여도도 완만하게 개선될 가능성이 있습니다."
  },
  context: {
    headline: "공격 우세 성향과 수비 변동이 함께 나타나는 패턴입니다.",
    analysisParagraph:
      "공격 라운드 승률이 수비 라운드보다 높게 유지되는 흐름이 보여 전반적으로 공격 주도 성향이 나타나는 편입니다. 반대로 수비 전환 이후에는 재배치 타이밍에서 편차가 반복되며 라운드 안정성이 낮아지는 경우가 이어지는 경향이 있습니다. 공수 전환 직후의 운영 기준이 조금 더 일정해지면 전체 컨텍스트 지표도 더 균형 있게 유지될 가능성이 있습니다."
  }
};

const MOCK_PREVIEW_FINAL_SUMMARY: FinalAnalysisResult = {
  headline: "공격 주도형 운영 흐름이 나타나는 패턴입니다.",
  analysisParagraph:
    "오프닝 주도권을 기반으로 라운드 템포를 먼저 가져오는 흐름이 비교적 자주 나타나는 편입니다. 다만 공수 전환이나 저투자 구간에서 라운드 안정성이 함께 흔들려 구간별 편차가 이어지는 경우가 보입니다. 핵심 강점 구간의 재현성을 유지하면서 변동 구간 조건을 함께 줄이면 종합 지표가 더 안정적으로 유지될 가능성이 있습니다."
};

const JOB_STATUS_LABELS: Record<AnalysisSnapshot["status"], string> = {
  queued: "대기",
  collecting: "수집 중",
  analyzing: "분석 중",
  completed: "완료",
  failed: "실패"
};

const SECTION_STATUS_LABELS: Record<JobSectionPayload["status"], string> = {
  pending: "대기",
  running: "진행 중",
  completed: "완료",
  error: "오류"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNumber(value: unknown, key: string): number {
  if (!isRecord(value)) {
    return 0;
  }
  const current = value[key];
  return typeof current === "number" ? current : Number(current ?? 0) || 0;
}

function getRecord(value: unknown, key: string): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  return isRecord(value[key]) ? (value[key] as Record<string, unknown>) : {};
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRatio(value: number): string {
  return value.toFixed(2);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function isThemeMetricKeyPercentLike(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.includes("rate") || normalized.includes("share") || normalized.includes("gap");
}

function formatThemeMetricLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatThemeMetricValue(key: string, value: number | string): string {
  if (typeof value !== "number") {
    return String(value);
  }
  if (isThemeMetricKeyPercentLike(key)) {
    return formatPercent(value);
  }
  return value.toFixed(4);
}

function buildSectionFactsFromThemePayload(payload: ThemeFeaturePayload): string[] {
  const entries = Object.entries(payload.metrics).slice(0, 3);
  const lines = entries.map(
    ([key, value]) => `${formatThemeMetricLabel(key)}: ${formatThemeMetricValue(key, value)}`
  );
  lines.push(
    `표본 ${payload.sampleMatches}경기 / ${payload.sampleRounds}라운드, 신뢰도 ${payload.confidence.toUpperCase()}`
  );
  return lines;
}

function toSectionAnalysis(result: ThemeAnalysisResultMap[AnalysisThemeKey]): JobSectionPayload["analysis"] {
  const analysisParagraph = result.analysisParagraph.trim();
  return {
    headline: result.headline,
    summary: analysisParagraph,
    actions: []
  };
}

function toThemeRawPayload(payload: ThemeFeaturePayload): Record<string, unknown> {
  return {
    __kind: "theme-metrics",
    theme: payload.theme,
    confidence: payload.confidence,
    sampleMatches: payload.sampleMatches,
    sampleRounds: payload.sampleRounds,
    metrics: payload.metrics
  };
}

function formatJobStatus(status: AnalysisSnapshot["status"]): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

function formatSectionStatus(status: JobSectionPayload["status"]): string {
  return SECTION_STATUS_LABELS[status] ?? status;
}

function buildIdleSnapshot(riotId: string, riotTag: string): AnalysisSnapshot {
  return {
    jobId: "",
    status: "queued",
    currentStep: "분석 작업을 생성하고 있습니다.",
    player: {
      riotId,
      riotTag,
      puuidMasked: ""
    },
    overview: {
      facts: []
    },
    progress: {
      completed: 0,
      total: 5,
      currentKey: null
    },
    sections: (Object.keys(SECTION_TITLES) as SectionKey[]).map((key) => ({
      key,
      title: SECTION_TITLES[key],
      status: "pending",
      facts: [],
      raw: {},
      analysis: null,
      error: null
    })),
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function buildMockPreviewSnapshot(riotId: string, riotTag: string): AnalysisSnapshot {
  const now = Date.now();
  const sections = (Object.keys(SECTION_TITLES) as SectionKey[]).map((sectionKey) => {
    const themeKey = SECTION_THEME_MAP[sectionKey];
    const themeFeature = MOCK_PREVIEW_THEME_FEATURES[themeKey];
    const themeAnalysis = MOCK_PREVIEW_THEME_ANALYSES[themeKey];
    return {
      key: sectionKey,
      title: SECTION_TITLES[sectionKey],
      status: "completed",
      facts: buildSectionFactsFromThemePayload(themeFeature),
      raw: toThemeRawPayload(themeFeature),
      analysis: toSectionAnalysis(themeAnalysis),
      error: null
    } satisfies JobSectionPayload;
  });

  return {
    jobId: "mock-preview",
    status: "completed",
    currentStep: "Mock 모드 예시 분석 데이터를 표시하고 있습니다.",
    player: {
      riotId,
      riotTag,
      puuidMasked: "mock-preview-puuid"
    },
    overview: {
      facts: [
        "Mock 모드 예시 데이터입니다. 실제 경기 데이터가 아닙니다.",
        "최근 10경기 기준 샘플 feature와 테마 분석 결과를 미리 확인할 수 있습니다.",
        "로그인 후 분석 시작을 누르면 세션 기반 실제(또는 mock API) 플로우로 다시 계산됩니다."
      ],
      raw: {
        matchesAnalyzed: 10,
        wins: 6,
        losses: 4,
        matchWinRate: 0.6,
        kills: 181,
        deaths: 149,
        assists: 63,
        rounds: 230,
        acs: 218,
        kdaRatio: 1.64
      }
    },
    progress: {
      completed: sections.length + 1,
      total: sections.length + 1,
      currentKey: null
    },
    finalSummary: MOCK_PREVIEW_FINAL_SUMMARY,
    sections,
    error: null,
    createdAt: now,
    updatedAt: now
  };
}

function ProgressBar({ percent, live }: { percent: number; live: boolean }) {
  return (
    <div className="metric-track h-3 w-full">
      <div className={`metric-fill h-full ${live ? "metric-fill-live" : ""}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="surface-panel glow-outline rounded-[24px] p-5">
      <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cyan-300/90 sm:tracking-[0.26em]">
        {label}
      </p>
      <h3 className="font-display text-4xl leading-none text-stone-50">{value}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{hint}</p>
    </article>
  );
}

function MetricRow({ label, value, rate }: { label: string; value: string; rate: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-stone-100">{value}</span>
      </div>
      <div className="metric-track h-2.5">
        <div className="metric-fill h-full" style={{ width: `${Math.max(4, Math.min(100, rate))}%` }} />
      </div>
    </div>
  );
}

function AttackDefenseVisual({ raw }: { raw: Record<string, unknown> }) {
  const attack = getRecord(raw, "attack");
  const defense = getRecord(raw, "defense");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">공격</p>
        <div className="space-y-4">
          <MetricRow label="KDA" value={formatRatio(getNumber(attack, "kdaRatio"))} rate={getNumber(attack, "kdaRatio") * 30} />
          <MetricRow label="라운드 승률" value={formatPercent(getNumber(attack, "roundWinRate"))} rate={clampPercent(getNumber(attack, "roundWinRate"))} />
          <MetricRow label="첫 교전 승률" value={formatPercent(getNumber(attack, "openingDuelRate"))} rate={clampPercent(getNumber(attack, "openingDuelRate"))} />
        </div>
      </div>
      <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">수비</p>
        <div className="space-y-4">
          <MetricRow label="KDA" value={formatRatio(getNumber(defense, "kdaRatio"))} rate={getNumber(defense, "kdaRatio") * 30} />
          <MetricRow label="라운드 승률" value={formatPercent(getNumber(defense, "roundWinRate"))} rate={clampPercent(getNumber(defense, "roundWinRate"))} />
          <MetricRow label="첫 교전 승률" value={formatPercent(getNumber(defense, "openingDuelRate"))} rate={clampPercent(getNumber(defense, "openingDuelRate"))} />
        </div>
      </div>
    </div>
  );
}

function EconomyVisual({ raw }: { raw: Record<string, unknown> }) {
  const buckets = [
    { key: "pistol", label: "피스톨" },
    { key: "eco", label: "이코" },
    { key: "half_buy", label: "하프바이" },
    { key: "full_buy", label: "풀바이" }
  ] as const;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {buckets.map((bucket) => {
        const current = getRecord(raw, bucket.key);
        return (
          <div key={bucket.key} className="rounded-[18px] border border-white/6 bg-black/15 p-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">{bucket.label}</p>
                <p className="mt-1 text-lg font-semibold text-stone-100">{getNumber(current, "rounds")} rounds</p>
              </div>
              <p className="text-sm text-slate-400">KDA {formatRatio(getNumber(current, "kdaRatio"))}</p>
            </div>
            <div className="space-y-3">
              <MetricRow label="라운드 승률" value={formatPercent(getNumber(current, "roundWinRate"))} rate={clampPercent(getNumber(current, "roundWinRate"))} />
              <MetricRow label="평균 장비가치" value={`${Math.round(getNumber(current, "avgTeamLoadoutValue"))}`} rate={Math.min(100, getNumber(current, "avgTeamLoadoutValue") / 45)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClutchVisual({ raw }: { raw: Record<string, unknown> }) {
  const overall = getRecord(raw, "overall");
  const byBucket = getRecord(raw, "byBucket");
  const rows = ["1v1", "1v2", "1v3+"] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">전체 클러치</p>
          <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {getNumber(overall, "attempts")} attempts
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricRow label="생존율" value={formatPercent(getNumber(overall, "survivalRate"))} rate={clampPercent(getNumber(overall, "survivalRate"))} />
          <MetricRow label="라운드 승률" value={formatPercent(getNumber(overall, "roundWinRate"))} rate={clampPercent(getNumber(overall, "roundWinRate"))} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((bucket) => {
          const current = getRecord(byBucket, bucket);
          return (
            <div key={bucket} className="rounded-[18px] border border-white/6 bg-black/15 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{bucket}</p>
              <p className="mt-2 text-sm text-slate-400">{getNumber(current, "attempts")}회 시도</p>
              <div className="mt-4 space-y-3">
                <MetricRow label="생존율" value={formatPercent(getNumber(current, "survivalRate"))} rate={clampPercent(getNumber(current, "survivalRate"))} />
                <MetricRow label="승률" value={formatPercent(getNumber(current, "roundWinRate"))} rate={clampPercent(getNumber(current, "roundWinRate"))} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UtilityVisual({ raw }: { raw: Record<string, unknown> }) {
  const castsByType = getRecord(raw, "castsByType");
  return (
    <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
      <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">유틸리티 사용량</p>
        <div className="space-y-4">
          <MetricRow label="라운드당 스킬 사용" value={formatRatio(getNumber(raw, "castsPerRound"))} rate={Math.min(100, getNumber(raw, "castsPerRound") * 40)} />
          <MetricRow label="10회당 어시스트" value={formatRatio(getNumber(raw, "assistsPer10Casts"))} rate={Math.min(100, getNumber(raw, "assistsPer10Casts") * 25)} />
          <MetricRow label="효과 발생 라운드 비율" value={formatPercent(getNumber(raw, "effectRoundRate"))} rate={clampPercent(getNumber(raw, "effectRoundRate"))} />
        </div>
      </div>
      <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">스킬 사용 구성</p>
        <div className="space-y-3">
          <MetricRow label="기본 스킬" value={`${getNumber(castsByType, "grenade")}`} rate={Math.min(100, getNumber(castsByType, "grenade"))} />
          <MetricRow label="보조 스킬" value={`${getNumber(castsByType, "ability1")}`} rate={Math.min(100, getNumber(castsByType, "ability1"))} />
          <MetricRow label="시그니처" value={`${getNumber(castsByType, "ability2")}`} rate={Math.min(100, getNumber(castsByType, "ability2"))} />
          <MetricRow label="궁극기" value={`${getNumber(castsByType, "ultimate")}`} rate={Math.min(100, getNumber(castsByType, "ultimate") * 4)} />
        </div>
      </div>
    </div>
  );
}

function ThemeMetricVisual({ raw }: { raw: Record<string, unknown> }) {
  const metrics = getRecord(raw, "metrics");
  const confidence = String(raw.confidence ?? "").toUpperCase();
  const sampleMatches = getNumber(raw, "sampleMatches");
  const sampleRounds = getNumber(raw, "sampleRounds");
  const entries = Object.entries(metrics).slice(0, 8);

  if (!entries.length) {
    return null;
  }

  return (
    <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300">
          표본 {sampleMatches}경기 / {sampleRounds}라운드
        </span>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
          신뢰도 {confidence || "N/A"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{formatThemeMetricLabel(key)}</p>
            <p className="mt-1 text-sm font-semibold text-stone-100">
              {formatThemeMetricValue(key, typeof value === "number" ? value : String(value))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionVisual({ section }: { section: JobSectionPayload }) {
  if (!isRecord(section.raw)) {
    return null;
  }

  if (section.raw.__kind === "theme-metrics") {
    return <ThemeMetricVisual raw={section.raw} />;
  }

  if (section.key === "attack_defense") {
    return <AttackDefenseVisual raw={section.raw} />;
  }
  if (section.key === "economy") {
    return <EconomyVisual raw={section.raw} />;
  }
  if (section.key === "clutch") {
    return <ClutchVisual raw={section.raw} />;
  }
  if (section.key === "utility") {
    return <UtilityVisual raw={section.raw} />;
  }
  return null;
}

function SectionCard({ section }: { section: JobSectionPayload }) {
  const badgeClass =
    section.status === "completed"
      ? "badge-success"
      : section.status === "running"
        ? "badge-info"
        : section.status === "error"
          ? "badge-error"
          : "bg-white/8 text-slate-300";

  const stateCopy =
    section.status === "running"
      ? "Gemini가 이 섹션을 집중 분석 중입니다. 완료되면 피드백과 액션 아이템이 바로 채워집니다."
      : section.status === "completed"
        ? "상황별 수치와 행동 교정 포인트가 준비되었습니다."
        : section.status === "error"
          ? "이 섹션은 오류로 종료되었습니다."
          : section.facts.length
            ? "이전 섹션이 끝나면 다음 순서로 호출됩니다."
            : "세분화 데이터를 계산 중입니다.";

  return (
    <article className="rounded-lg bg-gray-800 p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
            {section.key.replaceAll("_", " ")}
          </p>
          <h3 className="text-2xl font-bold text-white">
            {section.title}
          </h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${badgeClass}`}>
          {formatSectionStatus(section.status)}
        </span>
      </div>

      <p className="mb-4 text-gray-400 text-sm">{stateCopy}</p>

      {(section.status === "running" || section.status === "pending") && (
        <div className="mb-4 inline-flex items-center gap-3 rounded-full bg-gray-700 px-4 py-2 text-sm text-gray-300">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-blue-300"></div>
          {section.status === "running" ? "Gemini 분석 진행 중" : "순차 대기 중"}
        </div>
      )}

      <SectionVisual section={section} />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-gray-700 p-4">
          <h4 className="text-lg font-semibold text-blue-400 mb-3">세그먼트 요약</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            {section.facts.length ? (
              section.facts.map((fact, index) => (
                <li key={index} className="rounded bg-gray-600 p-3">
                  {fact}
                </li>
              ))
            ) : (
              <li className="text-gray-500">세분화 요약이 준비되면 여기에 표시됩니다.</li>
            )}
          </ul>
        </div>

        <div className="rounded-lg bg-gray-700 p-4">
          <h4 className="text-lg font-semibold text-red-400 mb-3">Gemini 피드백</h4>
          {section.analysis ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-bold text-white">
                  {section.analysis.headline}
                </h4>
                <p className="mt-2 text-gray-300 text-sm">
                  {section.analysis.summary}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">분석이 끝나면 문단형 피드백이 표시됩니다.</p>
          )}

          {section.error && (
            <p className="mt-4 rounded bg-red-900 p-3 text-red-200 text-sm">
              {section.error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function FinalSummaryCard({ summary }: { summary: AnalysisSnapshot["finalSummary"] }) {
  if (!summary) {
    return (
      <article className="rounded-lg bg-gray-800 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">최종 종합</p>
        <h3 className="mt-2 text-xl font-bold text-white">최종 요약 데이터가 아직 없습니다.</h3>
        <p className="mt-2 text-sm text-gray-400">3개 테마 분석이 완료되면 최종 종합 결과를 여기서 확인할 수 있습니다.</p>
      </article>
    );
  }

  return (
    <article className="rounded-lg bg-gray-800 p-6">
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">최종 종합</p>
        <h3 className="mt-2 text-2xl font-bold text-white">{summary.headline}</h3>
        <p className="mt-2 text-sm text-gray-300">{summary.analysisParagraph}</p>
      </div>
    </article>
  );
}

function Sidebar() {
  return null;
}

function AnalysisForm({
  riotId,
  setRiotId,
  riotTag,
  setRiotTag,
  matchCount,
  setMatchCount,
  sessionBound,
  isSubmitting,
  error,
  onSubmit
}: {
  riotId: string;
  setRiotId: (value: string) => void;
  riotTag: string;
  setRiotTag: (value: string) => void;
  matchCount: number;
  setMatchCount: (value: number) => void;
  sessionBound?: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [hasTagDelimiter, setHasTagDelimiter] = useState(riotTag.length > 0);

  useEffect(() => {
    if (riotTag.length > 0) {
      setHasTagDelimiter(true);
    }
  }, [riotTag]);

  const handleRiotIdChange = (value: string) => {
    if (value.includes("#")) {
      const idx = value.indexOf("#");
      const id = value.slice(0, idx);
      const tag = value.slice(idx + 1);
      setHasTagDelimiter(true);
      setRiotId(id);
      setRiotTag(tag);
    } else {
      setHasTagDelimiter(false);
      setRiotId(value);
      setRiotTag("");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg bg-gray-800 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">VALORANT 전술 분석</h2>
        <p className="text-gray-400 text-sm mb-4">
          {sessionBound ? "현재 로그인 세션 계정 기준으로 분석합니다." : "경쟁전 매치만 분석 가능합니다."}
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Riot 계정 (아이디#태그)</label>
          <input
            value={`${riotId}${hasTagDelimiter ? "#" + riotTag : ""}`}
            onChange={(event) => handleRiotIdChange(event.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none"
            placeholder="YourRiotId#TAG"
            autoComplete="off"
            type="text"
            disabled={sessionBound}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">최근 매치 개수</label>
            <select
              value={matchCount}
              onChange={(event) => setMatchCount(Number(event.target.value))}
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
            >
              <option value={5}>최근 5개</option>
              <option value={10}>최근 10개</option>
              <option value={20}>최근 20개</option>
              <option value={30}>최근 30개</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">에피소드</label>
            <select
              disabled
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-gray-400 focus:border-red-500 focus:outline-none opacity-50 cursor-not-allowed"
            >
              <option>자동 선택</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-red-600 py-2 px-4 text-white hover:bg-red-500 disabled:opacity-50 transition-colors font-medium"
        >
          {isSubmitting ? "분석 중..." : "분석 시작"}
        </button>

        <button
          type="button"
          onClick={() => {
            throw new Error("테스트 에러: 에러 페이지 표시를 위한 의도적인 클라이언트 사이드 오류입니다.");
          }}
          className="w-full mt-2 rounded-md bg-orange-600 py-2 px-4 text-white hover:bg-orange-500 transition-colors text-sm"
        >
          에러 페이지 테스트
        </button>

        {error && (
          <p className="mt-4 rounded-md bg-red-900 p-3 text-red-200 text-sm">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function OverviewCard({
  statusMeta,
  percent,
  live,
  resolvedCount,
  totalCount,
  sections,
  overviewRaw,
  snapshot
}: {
  statusMeta: any;
  percent: number;
  live: boolean;
  resolvedCount: number;
  totalCount: number;
  sections: any[];
  overviewRaw: any;
  snapshot: AnalysisSnapshot;
}) {
  return (
    <div className="rounded-lg bg-gray-800 p-6">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.pill}`}>
            {statusMeta.label}
          </span>
          <h2 className="text-2xl font-bold text-white mt-2">{statusMeta.title}</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">진행률</p>
          <p className="text-2xl font-bold text-white">{percent}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-red-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${live && percent === 0 ? 8 : percent}%` }}
        ></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Player Info */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            {snapshot.player.riotId}#{snapshot.player.riotTag}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">상태</span>
              <span className="text-sm font-semibold text-white">{formatJobStatus(snapshot.status)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">완료 섹션</span>
              <span className="text-sm font-semibold text-white">{resolvedCount} / {totalCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">현재 단계</span>
              <span className="text-sm text-gray-300">{snapshot.currentStep}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-400">매치</p>
            <p className="text-2xl font-bold text-white">{getNumber(overviewRaw, "matchesAnalyzed") || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">승률</p>
            <p className="text-2xl font-bold text-white">{formatPercent(getNumber(overviewRaw, "matchWinRate"))}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">ACS</p>
            <p className="text-2xl font-bold text-white">{getNumber(overviewRaw, "acs").toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400">KDA</p>
            <p className="text-2xl font-bold text-white">{formatRatio(getNumber(overviewRaw, "kdaRatio"))}</p>
          </div>
        </div>
      </div>

      {/* Facts */}
      {snapshot.overview.facts.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-blue-400 mb-3">핵심 요약</h4>
          <ul className="space-y-2">
            {snapshot.overview.facts.map((fact, index) => (
              <li key={index} className="rounded bg-gray-700 p-3 text-sm text-gray-300">
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg bg-gray-800 p-6 text-center">
      <p className="text-lg font-semibold text-amber-400">대기</p>
      <h3 className="text-xl font-bold text-white mt-2">RSO 버튼 또는 직접 입력으로 분석을 시작하세요.</h3>
      <p className="text-gray-400 mt-2">
        현재 프로토타입은 Riot 로그인 골격, 관리자 로그, 상황별 통계 카드, Gemini 행동 피드백 흐름까지 포함합니다.
      </p>
    </div>
  );
}

function SessionRequiredState({ showMockPreview }: { showMockPreview?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-800 p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">로그인 필요</p>
      <h3 className="mt-2 text-xl font-bold text-white">세션 기반 리포트를 시작하려면 Riot 로그인이 필요합니다.</h3>
      <p className="mt-2 text-sm text-gray-400">
        로그인 후 현재 계정의 `puuid` 기준으로 매치 동기화, feature snapshot, theme summary, 분석 결과를 순차 연결합니다.
      </p>
      {showMockPreview && (
        <p className="mt-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
          현재는 mock 모드라 오른쪽 패널에 예시 분석 데이터가 표시됩니다.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/api/auth/riot/start"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500"
        >
          Riot 로그인
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/20 bg-white/5 px-4 text-sm font-semibold text-slate-100 hover:bg-white/10"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}

function AuthBanner({ authState }: { authState?: string }) {
  if (!authState) {
    return null;
  }

  const copyMap: Record<string, { title: string; body: string; tone: string }> = {
    login_success: {
      title: "로그인이 완료되었습니다.",
      body: "내부 세션 쿠키가 발급되었습니다. 현재 단계는 Mock RSO 기본값이며, 이후 Real RSO로 교체 가능합니다.",
      tone: "badge-success"
    },
    logout_success: {
      title: "로그아웃되었습니다.",
      body: "내부 세션이 제거되었습니다.",
      tone: "badge-info"
    },
    logout_failed: {
      title: "로그아웃이 완전히 처리되지 않았습니다.",
      body: "세션 정리 중 오류가 발생했습니다. 다시 시도해 주세요.",
      tone: "badge-warning"
    },
    missing_rso_config: {
      title: "RSO 설정이 비어 있습니다.",
      body: "Real RSO를 쓰려면 RIOT_RSO_CLIENT_ID, RIOT_RSO_CLIENT_SECRET, RIOT_RSO_REDIRECT_URI를 .env.local에 채워야 합니다.",
      tone: "badge-warning"
    },
    real_provider_not_ready: {
      title: "Real RSO 콜백은 아직 미구현입니다.",
      body: "1단계에서는 mock provider가 기본이며, 실서비스 토큰 교환은 다음 단계에서 연결해야 합니다.",
      tone: "badge-warning"
    },
    missing_state: {
      title: "OAuth state가 없습니다.",
      body: "보안 검증을 위해 state는 필수입니다. 로그인 흐름을 다시 시작해 주세요.",
      tone: "badge-error"
    },
    missing_code: {
      title: "OAuth code가 없습니다.",
      body: "인가 코드가 누락되어 세션을 발급할 수 없습니다.",
      tone: "badge-error"
    },
    auth_start_failed: {
      title: "로그인 시작에 실패했습니다.",
      body: "인증 제공자 URL 생성 중 오류가 발생했습니다.",
      tone: "badge-error"
    },
    auth_callback_failed: {
      title: "로그인 완료 처리에 실패했습니다.",
      body: "콜백 처리 중 내부 오류가 발생했습니다.",
      tone: "badge-error"
    },
    state_mismatch: {
      title: "OAuth state 검증 실패",
      body: "세션 state와 콜백 값이 맞지 않아 흐름을 중단했습니다.",
      tone: "badge-error"
    },
    state_expired: {
      title: "OAuth state 만료",
      body: "인증 요청 유효 시간이 지나 로그인 흐름을 종료했습니다. 다시 시도해 주세요.",
      tone: "badge-error"
    },
    mock_not_allowed_in_production: {
      title: "운영 환경에서 mock 인증 비활성화",
      body: "production에서는 mock provider를 사용할 수 없습니다. real provider 설정을 확인해 주세요.",
      tone: "badge-error"
    },
    access_denied: {
      title: "RSO 접근 거부",
      body: "사용자가 Riot 로그인을 취소했거나 제공자가 요청을 거부했습니다.",
      tone: "badge-error"
    }
  };

  const content = copyMap[authState];
  if (!content) {
    return null;
  }

  return (
    <div className="rounded-lg bg-gray-800 mb-6 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${content.tone}`}>
          RSO
        </span>
        <h2 className="text-2xl font-bold text-white">
          {content.title}
        </h2>
      </div>
      <p className="text-gray-300 text-sm">{content.body}</p>
    </div>
  );
}

export function DashboardShell({ initialRiotId, initialRiotTag, authState, showMockPreview }: DashboardShellProps) {
  const [riotId, setRiotId] = useState(initialRiotId);
  const [riotTag, setRiotTag] = useState(initialRiotTag);
  const [matchCount, setMatchCount] = useState(10);
  const [snapshot, setSnapshot] = useState<AnalysisSnapshot | null>(() =>
    showMockPreview ? buildMockPreviewSnapshot(initialRiotId || "MockPlayer", initialRiotTag || "KR1") : null
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [authSession, setAuthSession] = useState<AuthSessionPayload>({
    authenticated: false,
    session: null
  });
  const [activeTab, setActiveTab] = useState<DashboardTabKey>("attack_defense");

  useEffect(() => {
    let isMounted = true;

    async function hydrateRiotIdentityFromSession() {
      setIsSessionLoading(true);
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) {
          if (isMounted) {
            setAuthSession({
              authenticated: false,
              session: null
            });
            setRiotId(initialRiotId);
            setRiotTag(initialRiotTag);
          }
          return;
        }

        const payload = (await response.json()) as AuthSessionPayload;
        if (!isMounted) {
          return;
        }

        setAuthSession(payload);
        if (payload.authenticated && payload.session) {
          setRiotId(payload.session.gameName);
          setRiotTag(payload.session.tagLine);
        } else {
          setRiotId(initialRiotId);
          setRiotTag(initialRiotTag);
        }
      } catch {
        if (isMounted) {
          setAuthSession({
            authenticated: false,
            session: null
          });
          setRiotId(initialRiotId);
          setRiotTag(initialRiotTag);
        }
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
        }
      }
    }

    void hydrateRiotIdentityFromSession();
    return () => {
      isMounted = false;
    };
  }, [initialRiotId, initialRiotTag]);

  const sections = snapshot?.sections ?? [];
  const sectionResolvedCount = sections.filter((section) => section.status === "completed" || section.status === "error").length;
  const finalSummaryResolvedCount = snapshot?.finalSummary ? 1 : 0;
  const totalCount = snapshot ? sections.length + 1 : 5;
  const resolvedCount = sectionResolvedCount + (snapshot ? finalSummaryResolvedCount : 0);
  const percent = snapshot ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const live = snapshot ? ["queued", "collecting", "analyzing"].includes(snapshot.status) : false;
  const overviewRaw = snapshot?.overview.raw;

  const statusMeta = !snapshot
    ? {
        pill: "bg-white/8 text-slate-300",
        label: "대기",
        title: "분석 대상 입력 후 전술 코칭을 시작하세요.",
        body: "최근 경쟁전 매치 수집 후, 3개 테마와 최종 종합 요약을 순차 분석합니다."
      }
    : snapshot.status === "failed"
      ? {
          pill: "badge-error",
          label: "실패",
          title: "분석이 중단되었습니다.",
          body: snapshot.currentStep
        }
      : snapshot.status === "completed" && sections.some((section) => section.status === "error")
        ? {
            pill: "badge-warning",
            label: "부분 완료",
            title: "일부 섹션만 완료되었습니다.",
            body: snapshot.currentStep
          }
        : snapshot.status === "completed"
          ? {
              pill: "badge-success",
              label: "완료",
              title: "모든 섹션 분석이 완료되었습니다.",
              body: snapshot.currentStep
            }
          : {
              pill: "badge-info",
              label: "진행 중",
              title: snapshot.status === "collecting" ? "최근 매치를 수집 중입니다." : "Gemini가 순차 분석 중입니다.",
              body: snapshot.currentStep
            };

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      cache: "no-store",
      ...init
    });
    const payload = (await response.json()) as T & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `요청 실패 (${response.status})`);
    }
    return payload as T;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isSessionLoading) {
      setError("세션 상태를 확인 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!authSession.authenticated || !authSession.session) {
      setError("세션이 없습니다. Riot 로그인 후 다시 시도해 주세요.");
      return;
    }

    setIsSubmitting(true);
    const currentSession = authSession.session;
    const startedAt = Date.now();
    const workingSnapshot = buildIdleSnapshot(currentSession.gameName, currentSession.tagLine);
    workingSnapshot.status = "collecting";
    workingSnapshot.currentStep = "세션 확인을 진행합니다.";
    workingSnapshot.createdAt = startedAt;
    workingSnapshot.updatedAt = startedAt;
    setSnapshot(workingSnapshot);

    try {
      const confirmedSession = await requestJson<AuthSessionPayload>("/api/auth/session");
      if (!confirmedSession.authenticated || !confirmedSession.session) {
        throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
      }

      startTransition(() =>
        setSnapshot((current) =>
          current
            ? {
                ...current,
                currentStep: "세션 확인 완료. 내 경기 동기화를 시작합니다.",
                updatedAt: Date.now()
              }
            : current
        )
      );

      const syncResult = await requestJson<MatchSyncResponse>("/api/matches/sync", {
        method: "POST",
      });
      startTransition(() =>
        setSnapshot((current) =>
          current
            ? {
                ...current,
                currentStep: `매치 동기화 완료 (신규 ${syncResult.insertedCount}, 중복 ${syncResult.skippedCount})`,
                updatedAt: Date.now()
              }
            : current
        )
      );

      const featureSnapshot = await requestJson<FeatureSnapshotResponse>(
        `/api/features/snapshot?limit=${encodeURIComponent(String(matchCount))}`
      );
      startTransition(() =>
        setSnapshot((current) =>
          current
            ? {
                ...current,
                currentStep: `Feature snapshot 조회 완료 (${featureSnapshot.aggregate.matchCount}경기 / ${featureSnapshot.aggregate.roundCount}라운드)`,
                updatedAt: Date.now()
              }
            : current
        )
      );

      const themePayloadResponse = await requestJson<ThemePayloadResponse>(
        `/api/features/theme-summary?limit=${encodeURIComponent(String(matchCount))}`
      );
      startTransition(() =>
        setSnapshot((current) =>
          current
            ? {
                ...current,
                status: "analyzing",
                currentStep: "Theme summary 조회 완료. 최종 분석 결과를 생성합니다.",
                updatedAt: Date.now()
              }
            : current
        )
      );

      if (featureSnapshot.aggregate.matchCount <= 0) {
        const emptySnapshot = buildIdleSnapshot(currentSession.gameName, currentSession.tagLine);
        emptySnapshot.status = "completed";
        emptySnapshot.currentStep = "동기화된 매치가 없어 분석 입력이 비어 있습니다.";
        emptySnapshot.sections = emptySnapshot.sections.map((section) => ({
          ...section,
          status: "completed",
          facts: ["표본 매치가 없어 해당 섹션의 정량 지표를 생성하지 못했습니다."],
          analysis: {
            headline: "데이터 부족",
            summary:
              "현재 계정에 동기화된 매치가 없어 이 섹션은 placeholder 상태입니다. 표본 매치를 확보한 뒤 다시 분석하면 실제 라운드 흐름을 반영한 문단형 결과를 확인할 수 있습니다.",
            actions: []
          },
          error: null
        }));
        emptySnapshot.finalSummary = {
          headline: "최종 요약이 보류되는 상태로 보입니다.",
          analysisParagraph:
            "표본 매치가 부족해 플레이스타일 종합 흐름을 충분히 판단하기 어려운 상태로 보입니다. 현재 단계에서는 데이터 부족으로 해석 편차가 커질 가능성이 있습니다. 표본이 확보되면 라운드 패턴을 더 안정적으로 연결해 볼 수 있을 것으로 보입니다."
        };
        emptySnapshot.progress = {
          completed: emptySnapshot.sections.length + 1,
          total: emptySnapshot.sections.length + 1,
          currentKey: null
        };
        emptySnapshot.overview = {
          facts: [
            `매치 동기화 결과: 신규 ${syncResult.insertedCount}, 중복 ${syncResult.skippedCount}, 실패 ${syncResult.failedCount}`,
            "표본 매치가 없어 theme summary/analysis 결과는 placeholder 상태입니다."
          ]
        };
        emptySnapshot.createdAt = startedAt;
        emptySnapshot.updatedAt = Date.now();
        setSnapshot(emptySnapshot);
        setIsSubmitting(false);
        return;
      }

      const analysisResult = await requestJson<AnalysisResultResponse>("/api/analysis/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          window: themePayloadResponse.window,
          version: themePayloadResponse.version,
          themeFeatures: themePayloadResponse.themeFeatures
        })
      });

      const sections = (Object.keys(SECTION_TITLES) as SectionKey[]).map((sectionKey) => {
        const themeKey = SECTION_THEME_MAP[sectionKey];
        const themeFeature = themePayloadResponse.themeFeatures[themeKey];
        const themeAnalysis = analysisResult.analysis.themeAnalyses[themeKey];
        return {
          key: sectionKey,
          title: SECTION_TITLES[sectionKey],
          status: "completed",
          facts: buildSectionFactsFromThemePayload(themeFeature),
          raw: toThemeRawPayload(themeFeature),
          analysis: toSectionAnalysis(themeAnalysis),
          error: null
        } satisfies JobSectionPayload;
      });

      const contextMetrics = themePayloadResponse.themeFeatures.context.metrics;
      const attackWinRate =
        typeof contextMetrics.attackWinRate === "number" ? contextMetrics.attackWinRate : 0;
      const defenseWinRate =
        typeof contextMetrics.defenseWinRate === "number" ? contextMetrics.defenseWinRate : 0;
      const estimatedMatchWinRate = Math.max(0, Math.min(1, (attackWinRate + defenseWinRate) / 2));

      const finalSnapshot: AnalysisSnapshot = {
        jobId: `session-${startedAt}`,
        status: "completed",
        currentStep: "세션 기반 분석 흐름이 완료되었습니다.",
        player: {
          riotId: currentSession.gameName,
          riotTag: currentSession.tagLine,
          puuidMasked:
            currentSession.puuid.length > 16
              ? `${currentSession.puuid.slice(0, 10)}...${currentSession.puuid.slice(-6)}`
              : currentSession.puuid
        },
        overview: {
          facts: [
            `매치 동기화 결과: 신규 ${syncResult.insertedCount}, 중복 ${syncResult.skippedCount}, 실패 ${syncResult.failedCount}`,
            analysisResult.analysis.finalSummary.headline,
            analysisResult.analysis.finalSummary.analysisParagraph
          ],
          raw: {
            matchesAnalyzed: featureSnapshot.aggregate.matchCount,
            wins: 0,
            losses: 0,
            matchWinRate: estimatedMatchWinRate,
            kills: 0,
            deaths: 0,
            assists: 0,
            rounds: featureSnapshot.aggregate.roundCount,
            acs: 0,
            kdaRatio: 0
          }
        },
        progress: {
          completed: sections.length + 1,
          total: sections.length + 1,
          currentKey: null
        },
        finalSummary: analysisResult.analysis.finalSummary,
        sections,
        error: null,
        createdAt: startedAt,
        updatedAt: Date.now()
      };

      setActiveTab("attack_defense");
      startTransition(() => setSnapshot(finalSnapshot));
      setIsSubmitting(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              status: "failed",
              currentStep: message,
              error: message,
              updatedAt: Date.now()
            }
          : current
      );
      setError(message);
      setIsSubmitting(false);
    }
  }

  const isSessionReady = authSession.authenticated && Boolean(authSession.session);

  return (
    <div className="app-page-shell w-screen">
      <div className="app-page-bg" />
      <SiteHeader />

      <main className="relative z-10 w-full px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-48 py-10 flex flex-col gap-12">
        <AuthBanner authState={authState} />

        <section className="flex flex-col md:flex-row gap-10 items-stretch">
          <div className="flex-1 min-w-[320px] max-w-[420px]">
            {isSessionLoading ? (
              <div className="rounded-lg bg-gray-800 p-6 text-sm text-gray-300">세션 상태를 확인하는 중입니다...</div>
            ) : isSessionReady ? (
              <AnalysisForm
                riotId={riotId}
                setRiotId={setRiotId}
                riotTag={riotTag}
                setRiotTag={setRiotTag}
                matchCount={matchCount}
                setMatchCount={setMatchCount}
                sessionBound
                isSubmitting={isSubmitting}
                error={error}
                onSubmit={handleSubmit}
              />
            ) : (
              <SessionRequiredState showMockPreview={showMockPreview} />
            )}
          </div>
          <div className="flex-1">
            {snapshot ? (
              <OverviewCard
                statusMeta={statusMeta}
                percent={percent}
                live={live}
                resolvedCount={resolvedCount}
                totalCount={totalCount}
                sections={sections}
                overviewRaw={overviewRaw}
                snapshot={snapshot}
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </section>

        {snapshot && (
          <section className="w-full mt-8">
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              {(Object.keys(DASHBOARD_TAB_TITLES) as DashboardTabKey[]).map((key) => {
                const isFinalTab = key === "final_summary";
                const section = isFinalTab ? null : snapshot.sections.find((item) => item.key === key);
                const isActive = activeTab === key;
                const isCompleted = isFinalTab
                  ? snapshot.status === "completed" && Boolean(snapshot.finalSummary)
                  : section?.status === "completed";
                const isError = isFinalTab ? snapshot.status === "failed" : section?.status === "error";
                const isRunning = isFinalTab
                  ? ["queued", "collecting", "analyzing"].includes(snapshot.status)
                  : section?.status === "running";

                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-6 py-3 text-base font-semibold rounded-2xl shadow transition-all duration-200 border-2 ${
                      isActive
                        ? "bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white border-red-500 scale-105 shadow-lg"
                        : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:border-orange-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{DASHBOARD_TAB_TITLES[key]}</span>
                      {isCompleted && <div className="w-3 h-3 bg-green-400 rounded-full"></div>}
                      {isError && <div className="w-3 h-3 bg-red-400 rounded-full"></div>}
                      {isRunning && <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 피드백 창을 화면 전체로 확대 */}
            <div className="w-full">
              {activeTab === "final_summary" ? (
                <FinalSummaryCard summary={snapshot.finalSummary ?? null} />
              ) : (
                snapshot.sections
                  .filter((section) => section.key === activeTab)
                  .map((section) => (
                    <SectionCard key={section.key} section={section} />
                  ))
              )}
            </div>
          </section>
        )}
      </main>
      <SiteFooter className="relative z-10 border-t border-gray-800/80 bg-black/30" />
    </div>
  );
}
