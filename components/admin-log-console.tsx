"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";

import type { LogEntry } from "@/src/server/types";

type AdminLogConsoleProps = {
  enabled: boolean;
  authorized: boolean;
};

function formatContext(value: unknown): string {
  return JSON.stringify(value, null, 2);
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
      <main className="mx-auto min-h-screen w-full max-w-[1000px] px-4 py-8 sm:px-6 lg:px-10">
        <section className="panel-shell rounded-[32px] p-6 lg:p-7">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.34em] text-cyan-300/90">Admin Logs</p>
          <h1 className="font-display text-6xl leading-[0.88] text-stone-50 sm:text-7xl">LOCKED</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            `ADMIN_ACCESS_TOKEN` 환경 변수를 설정해야 운영 로그 콘솔이 활성화됩니다.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
            >
              Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1000px] px-4 py-8 sm:px-6 lg:px-10">
        <section className="panel-shell rounded-[32px] p-6 lg:p-7">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.34em] text-cyan-300/90">Admin Logs</p>
          <h1 className="font-display text-6xl leading-[0.88] text-stone-50 sm:text-7xl">AUTH GATE</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            운영 로그에는 외부 API 오류와 내부 컨텍스트가 포함될 수 있으므로 관리자 토큰으로만 접근할 수 있습니다.
          </p>

          <form onSubmit={handleAuthenticate} className="mt-8 max-w-xl rounded-[28px] border border-white/8 bg-black/20 p-5">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Admin Token</span>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-base text-stone-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-cyan-300/6"
                placeholder="ADMIN_ACCESS_TOKEN"
                autoComplete="current-password"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isAuthenticating || !token.trim()}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#66dcff] to-[#2eb7ff] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAuthenticating ? "Checking..." : "Unlock Logs"}
              </button>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
              >
                Dashboard
              </Link>
            </div>
          </form>

          <p className="mt-5 text-sm text-slate-400">{status}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
      <section className="panel-shell rounded-[32px] p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.34em] text-cyan-300/90">Admin Logs</p>
            <h1 className="font-display text-6xl leading-[0.88] text-stone-50 sm:text-7xl">REQUEST TRACE</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              외부 API 실패, 작업 실패, 내부 예외를 실시간으로 확인하는 운영 콘솔입니다. 민감 값은 서버에서
              마스킹된 상태로만 표시됩니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#66dcff] to-[#2eb7ff] px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-950"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:bg-white/8"
            >
              Lock
            </button>
          </div>
        </div>
      </section>

      <section className="surface-panel mt-5 rounded-[32px] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/90">Monitor</p>
            <h2 className="font-display text-4xl leading-none text-stone-100">최근 로그 200개</h2>
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
                    <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-300">
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
                <h3 className="text-lg font-semibold text-stone-100">{log.message}</h3>
                {log.context && (
                  <pre className="mt-4 overflow-x-auto rounded-[18px] border border-white/6 bg-black/25 p-4 text-xs leading-6 text-slate-300">
                    {formatContext(log.context)}
                  </pre>
                )}
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 px-6 py-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-300">No Logs</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">아직 기록된 로그가 없거나 불러오지 못했습니다.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
