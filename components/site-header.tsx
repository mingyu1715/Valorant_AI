"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { LocalizedLink } from "@/components/localized-link";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/components/language-provider";
import { withLanguagePrefix } from "@/src/i18n/config";

type SiteHeaderProps = {
  className?: string;
  hideDashboardLink?: boolean;
};

const NAV_LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/privacy", labelKey: "nav.privacy" },
  { href: "/terms", labelKey: "nav.terms" }
] as const;

type HeaderAuthSessionPayload = {
  authenticated: boolean;
  session: {
    gameName: string;
    tagLine: string;
  } | null;
};

export function SiteHeader({ className = "", hideDashboardLink = false }: SiteHeaderProps) {
  const { tr, prefix } = useLanguage();
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
        const localizedApiPath = withLanguagePrefix("/api/auth/session", prefix);
        const response = await fetch(localizedApiPath, {
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
  }, [prefix]);

  const isLoggedIn = authSession.authenticated && Boolean(authSession.session);
  const riotDisplayName =
    isLoggedIn && authSession.session ? `${authSession.session.gameName}#${authSession.session.tagLine}` : "";
  const visibleNavLinks = hideDashboardLink ? NAV_LINKS.filter((link) => link.href !== "/dashboard") : NAV_LINKS;

  return (
    <header className={`relative z-20 border-b border-white/10 bg-black/25 backdrop-blur ${className}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <LocalizedLink href="/" className="inline-flex items-center gap-3 self-start">
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
        </LocalizedLink>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LanguageToggle />
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 sm:text-sm">
            {visibleNavLinks.map((link) => (
              <LocalizedLink key={link.href} href={link.href} className="hover:text-white">
                {tr(link.labelKey)}
              </LocalizedLink>
            ))}
          </nav>
          {isLoggedIn && (
            <span className="inline-flex min-h-9 items-center rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-semibold text-cyan-200 sm:text-sm">
              {riotDisplayName}
            </span>
          )}
          {isCheckingSession ? (
            <span className="inline-flex min-h-9 items-center rounded-md border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-300 sm:text-sm">
              {tr("auth.checkingSession")}
            </span>
          ) : isLoggedIn ? (
            <LocalizedLink
              href="/api/auth/logout"
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-100 hover:bg-white/10 sm:text-sm"
            >
              {tr("auth.logout")}
            </LocalizedLink>
          ) : (
            <LocalizedLink
              href="/api/auth/riot/start"
              className="inline-flex min-h-9 items-center justify-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 sm:text-sm"
            >
              {tr("auth.riotLogin")}
            </LocalizedLink>
          )}
        </div>
      </div>
    </header>
  );
}
