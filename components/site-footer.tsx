"use client";

import Link from "next/link";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className = "" }: SiteFooterProps) {
  return (
    <footer className={`relative z-20 border-t border-white/10 bg-black/20 ${className}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-sm">
        <p>© 2026 VALORANT AI Coach. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" className="hover:text-white">
            홈
          </Link>
          <Link href="/privacy" className="hover:text-white">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="hover:text-white">
            이용약관
          </Link>
        </div>
      </div>
    </footer>
  );
}
