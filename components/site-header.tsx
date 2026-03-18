"use client";

import Image from "next/image";
import Link from "next/link";

type SiteHeaderProps = {
  className?: string;
};

const NAV_LINKS = [
  { href: "/", label: "홈" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/admin/logs", label: "관리자" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" }
] as const;

export function SiteHeader({ className = "" }: SiteHeaderProps) {
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
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/api/auth/riot/start"
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-500 sm:text-sm"
          >
            Riot 로그인
          </Link>
          <Link
            href="/api/auth/logout"
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-100 hover:bg-white/10 sm:text-sm"
          >
            로그아웃
          </Link>
        </div>
      </div>
    </header>
  );
}
