"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";

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
      <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-cyan-300/90">{label}</p>
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
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Attack</p>
        <div className="space-y-4">
          <MetricRow label="KDA" value={formatRatio(getNumber(attack, "kdaRatio"))} rate={getNumber(attack, "kdaRatio") * 30} />
          <MetricRow label="라운드 승률" value={formatPercent(getNumber(attack, "roundWinRate"))} rate={clampPercent(getNumber(attack, "roundWinRate"))} />
          <MetricRow label="첫 교전 승률" value={formatPercent(getNumber(attack, "openingDuelRate"))} rate={clampPercent(getNumber(attack, "openingDuelRate"))} />
        </div>
      </div>
      <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Defense</p>
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Overall Clutch</p>
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
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Utility Throughput</p>
        <div className="space-y-4">
          <MetricRow label="라운드당 스킬 사용" value={formatRatio(getNumber(raw, "castsPerRound"))} rate={Math.min(100, getNumber(raw, "castsPerRound") * 40)} />
          <MetricRow label="10회당 어시스트" value={formatRatio(getNumber(raw, "assistsPer10Casts"))} rate={Math.min(100, getNumber(raw, "assistsPer10Casts") * 25)} />
          <MetricRow label="효과 발생 라운드 비율" value={formatPercent(getNumber(raw, "effectRoundRate"))} rate={clampPercent(getNumber(raw, "effectRoundRate"))} />
        </div>
      </div>
      <div className="rounded-[18px] border border-white/6 bg-black/15 p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Cast Mix</p>
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
    <article className="surface-panel glow-outline rounded-[28px] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-cyan-300/90">
            {section.key.replaceAll("_", " ")}
          </p>
          <h3 className="font-display text-3xl leading-none text-stone-100">{section.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${badgeClass}`}>
          {section.status}
        </span>
      </div>

      <p className="mb-4 text-sm leading-6 text-slate-400">{stateCopy}</p>

      {(section.status === "running" || section.status === "pending") && (
        <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-300">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-300" />
          {section.status === "running" ? "Gemini 분석 진행 중" : "순차 대기 중"}
        </div>
      )}

      <SectionVisual section={section} />

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-[20px] border border-white/6 bg-black/15 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Segmented Facts</p>
          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            {section.facts.length ? (
              section.facts.map((fact) => (
                <li key={fact} className="rounded-2xl border border-white/5 bg-white/4 px-3 py-2">
                  {fact}
                </li>
              ))
            ) : (
              <li className="text-slate-500">세분화 요약이 준비되면 여기에 표시됩니다.</li>
            )}
          </ul>
        </div>

        <div className="rounded-[20px] border border-white/6 bg-black/15 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Gemini Feedback</p>
          {section.analysis ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-display text-2xl leading-none text-stone-100">{section.analysis.headline}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-300">{section.analysis.summary}</p>
              </div>
              <ol className="space-y-2 text-sm leading-6 text-slate-200">
                {section.analysis.actions.map((action) => (
                  <li key={action} className="rounded-2xl border border-rose-500/15 bg-rose-500/8 px-3 py-2">
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">분석이 끝나면 실행 가능한 피드백 3가지가 표시됩니다.</p>
          )}

          {section.error && (
            <p className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm leading-6 text-orange-200">
              {section.error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function AuthBanner({ authState }: { authState?: string }) {
  if (!authState) {
    return null;
  }

  const copyMap: Record<string, { title: string; body: string; tone: string }> = {
    missing_rso_config: {
      title: "RSO 설정이 비어 있습니다.",
      body: "RIOT_RSO_CLIENT_ID와 RIOT_RSO_REDIRECT_URI를 .env.local에 채워야 Sign-On 버튼이 실제로 동작합니다.",
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
      body: "사용자가 Riot Sign-On 승인을 취소했거나 제공자가 요청을 거부했습니다.",
      tone: "badge-error"
    }
  };

  const content = copyMap[authState];
  if (!content) {
    return null;
  }

  return (
    <div className="surface-panel mb-6 rounded-[24px] border border-white/8 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${content.tone}`}>
          RSO
        </span>
        <h2 className="font-display text-3xl leading-none text-stone-100">{content.title}</h2>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{content.body}</p>
    </div>
  );
}

export function DashboardShell({ initialRiotId, initialRiotTag, authState }: DashboardShellProps) {
  const [riotId, setRiotId] = useState(initialRiotId);
  const [riotTag, setRiotTag] = useState(initialRiotTag);
  const [snapshot, setSnapshot] = useState<AnalysisSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        label: "READY",
        title: "분석 대상 입력 후 전술 코칭을 시작하세요.",
        body: "최근 경쟁전 매치 수집 후, 4개 상황 세그먼트를 순차 분석합니다."
      }
    : snapshot.status === "failed"
      ? {
          pill: "badge-error",
          label: "FAILED",
          title: "분석이 중단되었습니다.",
          body: snapshot.currentStep
        }
      : snapshot.status === "completed" && sections.some((section) => section.status === "error")
        ? {
            pill: "badge-warning",
            label: "PARTIAL",
            title: "일부 섹션만 완료되었습니다.",
            body: snapshot.currentStep
          }
        : snapshot.status === "completed"
          ? {
              pill: "badge-success",
              label: "DONE",
              title: "모든 섹션 분석이 완료되었습니다.",
              body: snapshot.currentStep
            }
          : {
              pill: "badge-info",
              label: "LIVE",
              title: snapshot.status === "collecting" ? "최근 매치를 수집 중입니다." : "Gemini가 순차 분석 중입니다.",
              body: snapshot.currentStep
            };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRiotId = riotId.trim();
    const normalizedRiotTag = riotTag.trim();
    setError(null);
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
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-10">
      <AuthBanner authState={authState} />

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="panel-shell rounded-[30px] p-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.34em] text-cyan-300/90">Reviewer Build</p>
            <h1 className="font-display text-6xl leading-[0.88] text-stone-50 sm:text-7xl">TACTICAL DASHBOARD</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Riot API 계정 데이터와 Gemini 코칭을 묶은 풀스택 프로토타입입니다. RSO 진입점, 보호된 관리자 로그, 상황별
              세분화 분석까지 한 화면에서 검토할 수 있습니다.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/api/auth/login"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#ff7b46] to-[#ff4655] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_36px_rgba(255,70,85,0.28)] hover:-translate-y-0.5"
              >
                Riot Sign-On
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
              >
                Landing
              </Link>
              <Link
                href="/admin/logs"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
              >
                Admin Logs
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="surface-panel rounded-[30px] p-6">
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/90">Analyze</p>
              <h2 className="font-display text-4xl leading-none text-stone-100">Match Intake</h2>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm text-slate-300">Riot ID</span>
              <input
                value={riotId}
                onChange={(event) => setRiotId(event.target.value)}
                className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-base text-stone-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-cyan-300/6"
                placeholder="YourRiotId"
                autoComplete="off"
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-sm text-slate-300">Tag</span>
              <input
                value={riotTag}
                onChange={(event) => setRiotTag(event.target.value)}
                className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-base text-stone-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-cyan-300/6"
                placeholder="TAG"
                autoComplete="off"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#ff7b46] to-[#ff4655] px-5 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[0_18px_36px_rgba(255,70,85,0.28)] disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? "Analyzing..." : "Start Analysis"}
            </button>

            <div className="mt-5 space-y-2 text-sm leading-6 text-slate-400">
              <p>민감 키는 서버 전용 환경 변수로만 읽습니다.</p>
              <p>실제 심사용 배포에서는 `USE_SAMPLE_ANALYTICS=1`로 데모 모드를 켤 수 있습니다.</p>
            </div>

            {error && (
              <p className="mt-5 rounded-[20px] border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm leading-6 text-orange-200">
                {error}
              </p>
            )}
          </form>

          <div className="surface-panel rounded-[30px] p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/90">Pipeline</p>
            <ol className="space-y-3 text-sm leading-6 text-slate-300">
              <li className="rounded-[18px] border border-white/6 bg-white/4 px-4 py-3">1. Riot 계정 조회 및 최근 경기 수집</li>
              <li className="rounded-[18px] border border-white/6 bg-white/4 px-4 py-3">2. 공수/경제/클러치/유틸 세그먼트 계산</li>
              <li className="rounded-[18px] border border-white/6 bg-white/4 px-4 py-3">3. Gemini를 섹션 단위로 순차 호출</li>
              <li className="rounded-[18px] border border-white/6 bg-white/4 px-4 py-3">4. 완료된 카드부터 즉시 대시보드에 반영</li>
            </ol>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="panel-shell rounded-[32px] p-6 lg:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${statusMeta.pill}`}>
                    {statusMeta.label}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Riot Reviewer Dashboard</p>
                </div>
                <h2 className="font-display text-5xl leading-[0.9] text-stone-100 sm:text-6xl">{statusMeta.title}</h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{statusMeta.body}</p>
              </div>

              <div className="min-w-[260px] rounded-[24px] border border-white/8 bg-black/20 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/90">Progress</p>
                  <span className="text-sm font-semibold text-stone-100">{percent}%</span>
                </div>
                <ProgressBar percent={live && percent === 0 ? 8 : percent} live={live} />
                <p className="mt-3 text-sm text-slate-400">
                  {resolvedCount} / {sections.length || 4} sections resolved
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Matches"
              value={`${getNumber(overviewRaw, "matchesAnalyzed") || 0}`}
              hint="최근 분석 대상으로 수집된 경기 수"
            />
            <StatCard
              label="Win Rate"
              value={snapshot?.overview.raw ? formatPercent(getNumber(overviewRaw, "matchWinRate")) : "-"}
              hint="전체 분석 표본 기준 매치 승률"
            />
            <StatCard
              label="ACS"
              value={snapshot?.overview.raw ? getNumber(overviewRaw, "acs").toFixed(1) : "-"}
              hint="전체 라운드 기준 평균 ACS"
            />
            <StatCard
              label="KDA"
              value={snapshot?.overview.raw ? formatRatio(getNumber(overviewRaw, "kdaRatio")) : "-"}
              hint="킬+어시스트 대비 데스 비율"
            />
          </div>

          <div className="surface-panel rounded-[30px] p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/90">Overview</p>
                <h2 className="font-display text-4xl leading-none text-stone-100">
                  {snapshot ? `${snapshot.player.riotId}#${snapshot.player.riotTag}` : "No Active Snapshot"}
                </h2>
              </div>
              <span className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-300">
                {snapshot?.player.puuidMasked || "PUUID pending"}
              </span>
            </div>

            {snapshot ? (
              <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
                <div className="rounded-[22px] border border-white/6 bg-black/15 p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Key Facts</p>
                  <ul className="space-y-3 text-sm leading-6 text-slate-300">
                    {snapshot.overview.facts.map((fact) => (
                      <li key={fact} className="rounded-2xl border border-white/5 bg-white/4 px-4 py-3">
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[22px] border border-white/6 bg-black/15 p-5">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Reviewer Notes</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-white/6 bg-white/4 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Status</p>
                      <p className="mt-2 text-lg font-semibold text-stone-100">{snapshot.status}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/6 bg-white/4 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current Step</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{snapshot.currentStep}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/6 bg-white/4 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Completed</p>
                      <p className="mt-2 text-lg font-semibold text-stone-100">
                        {snapshot.progress.completed} / {snapshot.progress.total}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-white/6 bg-white/4 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current Key</p>
                      <p className="mt-2 text-lg font-semibold text-stone-100">
                        {snapshot.progress.currentKey ? SECTION_TITLES[snapshot.progress.currentKey] : "None"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-black/15 px-6 py-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">Ready</p>
                <h3 className="mt-3 font-display text-4xl leading-none text-stone-100">RSO 버튼 또는 직접 입력으로 분석을 시작하세요.</h3>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                  현재 프로토타입은 Riot Sign-On 골격, 관리자 로그, 상황별 통계 카드, Gemini 행동 피드백 흐름까지 포함합니다.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-5">
            {(snapshot?.sections ?? buildIdleSnapshot(riotId, riotTag).sections).map((section) => (
              <SectionCard key={section.key} section={section} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
