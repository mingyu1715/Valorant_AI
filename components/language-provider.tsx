"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import { stripLanguagePrefix, type AppLanguage } from "@/src/i18n/config";
import { getMessage } from "@/src/i18n/messages";

export type Language = AppLanguage;

type LanguageContextValue = {
  language: AppLanguage;
  prefix: AppLanguage | null;
  tr: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLanguage,
  initialPrefix
}: {
  children: React.ReactNode;
  initialLanguage: AppLanguage;
  initialPrefix: AppLanguage | null;
}) {
  const pathname = usePathname();
  const { langFromPath } = stripLanguagePrefix(pathname || "/");

  // URL prefix takes precedence over header-derived initial language.
  const language = langFromPath ?? initialLanguage;
  const prefix = langFromPath ?? initialPrefix;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      prefix,
      tr: (key) => getMessage(language, key)
    }),
    [language, prefix]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }
  return context;
}

export function t(language: AppLanguage, copy: { ko: string; en: string }): string {
  return language === "en" ? copy.en : copy.ko;
}
