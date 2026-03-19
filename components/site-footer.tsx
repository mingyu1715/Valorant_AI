"use client";

import { LocalizedLink } from "@/components/localized-link";
import { useLanguage } from "@/components/language-provider";

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className = "" }: SiteFooterProps) {
  const { tr } = useLanguage();

  return (
    <footer className={`relative z-20 border-t border-white/10 bg-black/20 ${className}`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-sm">
        <p>{tr("footer.copyright")}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LocalizedLink href="/" className="hover:text-white">{tr("nav.home")}</LocalizedLink>
          <LocalizedLink href="/privacy" className="hover:text-white">{tr("nav.privacy")}</LocalizedLink>
          <LocalizedLink href="/terms" className="hover:text-white">{tr("nav.terms")}</LocalizedLink>
        </div>
      </div>
    </footer>
  );
}
