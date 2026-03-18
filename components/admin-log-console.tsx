"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { LogEntry } from "@/src/server/types";

type AdminLogConsoleProps = {
  enabled: boolean;
  authorized: boolean;
};

type ApiTestResult = {
  label: string;
  method: string;
  url: string;
  status: number | null;
  ok: boolean;
  timestamp: string;
  body: unknown;
};

function formatContext(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as Record<string, unknown>).error;
  return typeof error === "string" ? error : null;
}

function AdminPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-page-shell">
      <div className="app-page-bg" />
      <SiteHeader />
      <div className="relative z-10">{children}</div>
      <SiteFooter className="relative z-10 border-t border-gray-800/80 bg-black/30" />
    </div>
  );
}

export function AdminLogConsole({ enabled, authorized }: AdminLogConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState(
    !enabled
      ? "관리자 로그 콘솔이 비활성화되어 있습니다."
      : authorized
        ? "로그를 불러오는 중입니다."
        : "관리자 토큰 인증이 필요합니다."
  );
  const [testStatus, setTestStatus] = useState("운영 테스트 실행 대기");
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [token, setToken] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function schedulePoll(delayMs = 2000) {
    stopPolling();
    pollTimerRef.current = setTimeout(() => {
      void loadLogs();
    }, delayMs);
  }

  async function loadLogs() {
    if (!enabled || !authorized) {
      stopPolling();
      return;
    }

    try {
      setStatus("최근 로그를 불러오는 중입니다.");
      const response = await fetch("/api/admin/logs?limit=200", { cache: "no-store" });
      const payload = (await response.json()) as { logs?: LogEntry[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `요청 실패 (${response.status})`);
      }
      startTransition(() => setLogs(payload.logs ?? []));
      setStatus(`최근 갱신: ${new Date().toLocaleTimeString("ko-KR")}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      startTransition(() => setLogs([]));
    } finally {
      schedulePoll();
    }
  }

  async function handleAuthenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAuthenticating(true);
    setStatus("관리자 세션을 생성하는 중입니다.");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `요청 실패 (${response.status})`);
      }

      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      setToken("");
      setIsAuthenticating(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/session", {
      method: "DELETE"
    });
    window.location.reload();
  }

  async function runApiTest(label: string, url: string, init?: RequestInit) {
    setIsRunningTest(true);
    setTestStatus(`${label} 실행 중...`);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        ...init
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      setTestResult({
        label,
        method: init?.method ?? "GET",
        url,
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString(),
        body: payload
      });

      if (!response.ok) {
        const apiError = extractErrorMessage(payload);
        throw new Error(apiError || `요청 실패 (${response.status})`);
      }

      setTestStatus(`${label} 성공`);
    } catch (error) {
      setTestStatus(error instanceof Error ? `${label} 실패: ${error.message}` : `${label} 실패`);
    } finally {
      setIsRunningTest(false);
    }
  }

  async function handleTestSession() {
    await runApiTest("유저 세션 확인", "/api/auth/session");
  }

  async function handleTestMatchSync() {
    await runApiTest("내 경기 동기화", "/api/matches/sync", {
      method: "POST"
    });
  }

  async function handleTestAnalysisGenerate() {
    await runApiTest("분석 결과 생성", "/api/analysis/result", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        limit: 10,
        useCache: false
      })
    });
  }

  async function handleTestAnalysisFetch() {
    await runApiTest("분석 결과 조회", "/api/analysis/result?limit=10&useCache=true");
  }

  useEffect(() => {
    if (!enabled || !authorized) {
      stopPolling();
      return;
    }

    void loadLogs();
    return () => stopPolling();
  }, [authorized, enabled]);

  if (!enabled) {
    return (
      <AdminPageFrame>
        <main className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6 lg:px-10">
          <section className="rounded-3xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 backdrop-blur-sm lg:p-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-300/90 sm:text-sm sm:tracking-[0.32em]">
              관리자 로그
            </p>
            <h1 className="font-display text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.92] text-stone-50 text-balance break-words">
              잠김
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 text-pretty break-words">
              `ADMIN_ACCESS_TOKEN` 환경 변수를 설정해야 운영 로그 콘솔이 활성화됩니다.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
              >
                대시보드
              </Link>
            </div>
          </section>
        </main>
      </AdminPageFrame>
    );
  }

  if (!authorized) {
    return (
      <AdminPageFrame>
        <main className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6 lg:px-10">
          <section className="rounded-3xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 backdrop-blur-sm lg:p-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-300/90 sm:text-sm sm:tracking-[0.32em]">
              관리자 로그
            </p>
            <h1 className="font-display text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.92] text-stone-50 text-balance break-words">
              인증 필요
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 text-pretty break-words">
              운영 로그에는 외부 API 오류와 내부 컨텍스트가 포함될 수 있으므로 관리자 토큰으로만 접근할 수 있습니다.
            </p>

            <form onSubmit={handleAuthenticate} className="mt-8 max-w-xl rounded-[28px] border border-gray-700/60 bg-gray-900/40 p-5">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">관리자 토큰</span>
                <input
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-base text-stone-100 outline-none ring-0 placeholder:text-slate-500 focus:border-red-400/50 focus:bg-red-400/10"
                  placeholder="ADMIN_ACCESS_TOKEN"
                  autoComplete="current-password"
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isAuthenticating || !token.trim()}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-500 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAuthenticating ? "확인 중..." : "로그 열기"}
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
                >
                  대시보드
                </Link>
              </div>
            </form>

            <p className="mt-5 text-sm text-slate-400">{status}</p>
          </section>
        </main>
      </AdminPageFrame>
    );
  }

  return (
    <AdminPageFrame>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
        <section className="rounded-3xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 backdrop-blur-sm lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-300/90 sm:text-sm sm:tracking-[0.32em]">
                관리자 로그
              </p>
              <h1 className="font-display text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.92] text-stone-50 text-balance break-words">
                요청 추적
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300 text-pretty break-words">
                외부 API 실패, 작업 실패, 내부 예외를 실시간으로 확인하는 운영 콘솔입니다. 민감 값은 서버에서
                마스킹된 상태로만 표시됩니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
              >
                대시보드
              </Link>
              <button
                type="button"
                onClick={() => void loadLogs()}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-500 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-white"
              >
                새로고침
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
              >
                잠금
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-gray-700/50 bg-gray-900/55 p-6 backdrop-blur-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-red-300/90">운영 테스트</p>
              <h2 className="font-display text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.05] text-stone-100 text-balance break-words">
                관리자 테스트 패널
              </h2>
            </div>
            <span className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-300">{testStatus}</span>
          </div>

          <div className="grid gap-4 rounded-[24px] border border-white/8 bg-black/20 p-5">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleTestSession()}
                disabled={isRunningTest}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                유저 세션 확인
              </button>
              <button
                type="button"
                onClick={() => void handleTestMatchSync()}
                disabled={isRunningTest}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                내 경기 동기화
              </button>
              <button
                type="button"
                onClick={() => void handleTestAnalysisGenerate()}
                disabled={isRunningTest}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-500 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                분석 결과 생성
              </button>
              <button
                type="button"
                onClick={() => void handleTestAnalysisFetch()}
                disabled={isRunningTest}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/10 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-orange-200 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                분석 결과 조회
              </button>
            </div>

            {testResult && (
              <article className={`rounded-[18px] border p-4 ${testResult.ok ? "border-cyan-500/30 bg-cyan-500/10" : "border-orange-500/30 bg-orange-500/10"}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-300">
                    {testResult.label} · {testResult.method} {testResult.url}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${testResult.ok ? "badge-success" : "badge-error"}`}>
                    {testResult.status}
                  </span>
                </div>
                <pre className="overflow-x-auto rounded-[14px] border border-white/8 bg-black/25 p-3 text-xs leading-6 text-slate-300">
                  {formatContext(testResult.body)}
                </pre>
              </article>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-gray-700/50 bg-gray-900/55 p-6 backdrop-blur-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-red-300/90">모니터링</p>
              <h2 className="font-display text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.05] text-stone-100 text-balance break-words">
                최근 로그 200개
              </h2>
            </div>
            <span className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-slate-300">{status}</span>
          </div>

          <div className="grid gap-4">
            {logs.length ? (
              logs.map((log, index) => (
                <article
                  key={`${log.timestamp}-${log.source}-${index}`}
                  className={`rounded-[24px] border p-5 ${
                    log.level === "error"
                      ? "border-orange-500/25 bg-orange-500/8"
                      : "border-white/8 bg-white/4"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                      <span>{log.timestamp}</span>
                      <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-red-300">
                        {log.source}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                        log.level === "error" ? "badge-error" : "badge-info"
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-100 break-words">{log.message}</h3>
                  {log.context != null && (
                    <pre className="mt-4 overflow-x-auto rounded-[18px] border border-white/6 bg-black/25 p-4 text-xs leading-6 text-slate-300">
                      {formatContext(log.context)}
                    </pre>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 px-6 py-12 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">로그 없음</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">아직 기록된 로그가 없거나 불러오지 못했습니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminPageFrame>
  );
}
