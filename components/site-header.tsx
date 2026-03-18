"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type SiteHeaderProps = {
  className?: string;
  hideDashboardLink?: boolean;
};

const NAV_LINKS = [
  { href: "/", label: "홈" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" }
] as const;

type HeaderAuthSessionPayload = {
  authenticated: boolean;
  session: {
    gameName: string;
    tagLine: string;
  } | null;
};

export function SiteHeader({ className = "", hideDashboardLink = false }: SiteHeaderProps) {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authSession, setAuthSession] = useState<HeaderAuthSessionPayload>({
    authenticated: false,
    session: null
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setIsCheckingSession(true);
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store"
        });
        if (!response.ok) {
          if (isMounted) {
            setAuthSession({
              authenticated: false,
              session: null
            });
          }
          return;
        }

        const payload = (await response.json()) as HeaderAuthSessionPayload;
        if (!isMounted) {
          return;
        }
        setAuthSession(payload);
      } catch {
        if (isMounted) {
          setAuthSession({
            authenticated: false,
            session: null
          });
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    void loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const isLoggedIn = authSession.authenticated && Boolean(authSession.session);
  const riotDisplayName =
    isLoggedIn && authSession.session ? `${authSession.session.gameName}#${authSession.session.tagLine}` : "";
  const visibleNavLinks = hideDashboardLink ? NAV_LINKS.filter((link) => link.href !== "/dashboard") : NAV_LINKS;

  return (
    <header className={`relative z-20 border-b border-white/10 bg-black/25 backdrop-blur ${className}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="inline-flex items-center gap-3 self-start">
          <span className="inline-flex items-center justify-center rounded-lg bg-amber-50/95 p-2 shadow-sm ring-1 ring-amber-100/60">
            <Image
              src="/logo.svg"
              alt="VALORANT AI Coach 로고"
              width={30}
              height={24}
              className="h-5 w-auto"
              priority
            />
          </span>
          <span className="text-base font-semibold tracking-wide text-stone-100">VALORANT AI Coach</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 sm:text-sm">
            {visibleNavLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
          {isLoggedIn && (
            <span className="inline-flex min-h-9 items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-200 sm:text-sm">
              {riotDisplayName}
            </span>
          )}
          {isCheckingSession ? (
            <span className="inline-flex min-h-9 items-center rounded-md border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-300 sm:text-sm">
              세션 확인 중...
            </span>
          ) : isLoggedIn ? (
            <Link
              href="/api/auth/logout"
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-100 hover:bg-white/10 sm:text-sm"
            >
              로그아웃
            </Link>
          ) : (
            <Link
              href="/api/auth/riot/start"
              className="inline-flex min-h-9 items-center justify-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 sm:text-sm"
            >
              Riot 로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
