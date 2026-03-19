"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import { stripLanguagePrefix, withLanguagePrefix, type AppLanguage } from "@/src/i18n/config";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { strippedPathname } = stripLanguagePrefix(pathname);

  const switchLanguage = (target: AppLanguage) => {
    const nextPath = withLanguagePrefix(strippedPathname, target);
    const query = searchParams.toString();
    router.push(query ? `${nextPath}?${query}` : nextPath);
  };

  return (
    <div
      className={`inline-flex items-center rounded-md border border-white/20 bg-white/5 p-1 text-xs text-slate-200 ${className}`}
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => switchLanguage("ko")}
        className={`rounded px-2 py-1 transition-colors ${language === "ko" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
      >
        KO
      </button>
      <button
        type="button"
        onClick={() => switchLanguage("en")}
        className={`rounded px-2 py-1 transition-colors ${language === "en" ? "bg-white/20 text-white" : "hover:bg-white/10"}`}
      >
        EN
      </button>
    </div>
  );
}
