"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { AnalysisSnapshot, JobSectionPayload, SectionKey } from "@/src/server/types";

type DashboardShellProps = {
  initialRiotId: string;
  initialRiotTag: string;
  authState?: string;
};

const SECTION_TITLES: Record<SectionKey, string> = {
  attack_defense: "공수 진영 분석",
  economy: "자금 및 경제",
  clutch: "클러치 및 멘탈",
  utility: "스킬 효율성"
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
      total: 4,
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

function SectionVisual({ section }: { section: JobSectionPayload }) {
  if (!isRecord(section.raw)) {
    return null;
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
              <ol className="space-y-2 text-sm text-gray-200">
                {section.analysis.actions.map((action, index) => (
                  <li key={index} className="rounded bg-red-900/20 border border-red-500/30 p-3">
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">분석이 끝나면 실행 가능한 피드백 3가지가 표시됩니다.</p>
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
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [hasTagDelimiter, setHasTagDelimiter] = useState(riotTag.length > 0);

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
        <p className="text-gray-400 text-sm mb-4">경쟁전 매치만 분석 가능합니다.</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Riot 계정 (아이디#태그)</label>
          <input
            value={`${riotId}${hasTagDelimiter ? "#" + riotTag : ""}`}
            onChange={(event) => handleRiotIdChange(event.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-red-500 focus:outline-none"
            placeholder="YourRiotId#TAG"
            autoComplete="off"
            type="text"
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
  sections,
  overviewRaw,
  snapshot
}: {
  statusMeta: any;
  percent: number;
  live: boolean;
  resolvedCount: number;
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
              <span className="text-sm font-semibold text-white">{resolvedCount} / {sections.length || 4}</span>
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

function AuthBanner({ authState }: { authState?: string }) {
  if (!authState) {
    return null;
  }

  const copyMap: Record<string, { title: string; body: string; tone: string }> = {
    missing_rso_config: {
      title: "RSO 설정이 비어 있습니다.",
      body: "RIOT_RSO_CLIENT_ID와 RIOT_RSO_REDIRECT_URI를 .env.local에 채워야 로그인 버튼이 실제로 동작합니다.",
      tone: "badge-warning"
    },
    code_received: {
      title: "OAuth 콜백 코드 수신",
      body: "인가 코드는 수신됐고, 토큰 교환 단계는 프로덕션 승인 후 연결할 수 있도록 뼈대만 준비해 두었습니다.",
      tone: "badge-success"
    },
    state_mismatch: {
      title: "OAuth state 검증 실패",
      body: "세션 state와 콜백 값이 맞지 않아 흐름을 중단했습니다.",
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

export function DashboardShell({ initialRiotId, initialRiotTag, authState }: DashboardShellProps) {
  const [riotId, setRiotId] = useState("");
  const [riotTag, setRiotTag] = useState("");
  const [matchCount, setMatchCount] = useState(10);
  const [snapshot, setSnapshot] = useState<AnalysisSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<SectionKey>("attack_defense");
  const activeJobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  async function fetchSnapshot(jobId: string): Promise<AnalysisSnapshot> {
    const response = await fetch(`/api/analyze?jobId=${encodeURIComponent(jobId)}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as AnalysisSnapshot & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `요청 실패 (${response.status})`);
    }
    return payload;
  }

  function schedulePoll(jobId: string, delayMs = 900) {
    stopPolling();
    pollTimerRef.current = setTimeout(() => {
      void pollJob(jobId);
    }, delayMs);
  }

  async function pollJob(jobId: string) {
    if (activeJobIdRef.current !== jobId) {
      return;
    }

    try {
      const nextSnapshot = await fetchSnapshot(jobId);
      if (activeJobIdRef.current !== jobId) {
        return;
      }

      startTransition(() => setSnapshot(nextSnapshot));

      if (nextSnapshot.status === "completed" || nextSnapshot.status === "failed") {
        setIsSubmitting(false);
        stopPolling();
        return;
      }

      schedulePoll(jobId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
      setIsSubmitting(false);
      stopPolling();
    }
  }

  useEffect(() => () => stopPolling(), []);

  const sections = snapshot?.sections ?? [];
  const resolvedCount = sections.filter((section) => section.status === "completed" || section.status === "error").length;
  const percent = sections.length ? Math.round((resolvedCount / sections.length) * 100) : 0;
  const live = snapshot ? ["queued", "collecting", "analyzing"].includes(snapshot.status) : false;
  const overviewRaw = snapshot?.overview.raw;

  const statusMeta = !snapshot
    ? {
        pill: "bg-white/8 text-slate-300",
        label: "대기",
        title: "분석 대상 입력 후 전술 코칭을 시작하세요.",
        body: "최근 경쟁전 매치 수집 후, 4개 상황 세그먼트를 순차 분석합니다."
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRiotId = riotId.trim();
    const normalizedRiotTag = riotTag.trim();
    setError(null);
    // # 포함 여부와 전체 길이만 체크
    const fullAccount = `${riotId}${riotTag ? '#' + riotTag : ''}`;
    if (!fullAccount.includes('#') || riotTag.trim() === "") {
      setError('아이디와 태그를 모두 입력해야 합니다. 예시: 닉네임#태그');
      return;
    }
    if (fullAccount.length < 3 || fullAccount.length > 21) {
      setError("Riot 계정은 3~21자여야 합니다.");
      return;
    }
    setIsSubmitting(true);
    const idleSnapshot = buildIdleSnapshot(normalizedRiotId, normalizedRiotTag);
    setSnapshot(idleSnapshot);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          riotId: normalizedRiotId,
          riotTag: normalizedRiotTag
        })
      });

      const createdSnapshot = (await response.json()) as AnalysisSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(createdSnapshot.error || `요청 실패 (${response.status})`);
      }

      activeJobIdRef.current = createdSnapshot.jobId;
      startTransition(() => setSnapshot(createdSnapshot));
      if (createdSnapshot.status === "completed" || createdSnapshot.status === "failed") {
        setIsSubmitting(false);
        return;
      }

      schedulePoll(createdSnapshot.jobId, 700);
    } catch (submitError) {
      setSnapshot(null);
      setIsSubmitting(false);
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    }
  }

  return (
    <div className="app-page-shell w-screen">
      <div className="app-page-bg" />
      <SiteHeader />

      <main className="relative z-10 w-full px-4 md:px-12 lg:px-24 xl:px-32 2xl:px-48 py-10 flex flex-col gap-12">
        <AuthBanner authState={authState} />

        <section className="flex flex-col md:flex-row gap-10 items-stretch">
          <div className="flex-1 min-w-[320px] max-w-[420px]">
            <AnalysisForm
              riotId={riotId}
              setRiotId={setRiotId}
              riotTag={riotTag}
              setRiotTag={setRiotTag}
              matchCount={matchCount}
              setMatchCount={setMatchCount}
              isSubmitting={isSubmitting}
              error={error}
              onSubmit={handleSubmit}
            />
          </div>
          <div className="flex-1">
            {snapshot ? (
              <OverviewCard
                statusMeta={statusMeta}
                percent={percent}
                live={live}
                resolvedCount={resolvedCount}
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
              {(Object.keys(SECTION_TITLES) as SectionKey[]).map((key) => {
                const section = snapshot.sections.find(s => s.key === key);
                const isActive = activeTab === key;
                const isCompleted = section?.status === "completed";
                const isError = section?.status === "error";
                const isRunning = section?.status === "running";

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
                      <span>{SECTION_TITLES[key]}</span>
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
              {snapshot.sections
                .filter(section => section.key === activeTab)
                .map((section) => (
                  <SectionCard key={section.key} section={section} />
                ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter className="relative z-10 border-t border-gray-800/80 bg-black/30" />
    </div>
  );
}
