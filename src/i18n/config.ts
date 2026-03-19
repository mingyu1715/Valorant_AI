export const SUPPORTED_LANGUAGES = ["ko", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export const REQUEST_LANG_HEADER = "x-site-lang";
export const REQUEST_LANG_SOURCE_HEADER = "x-site-lang-source";
export const REQUEST_LANG_PREFIX_HEADER = "x-site-lang-prefix";

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function normalizeLanguageTag(value: string): AppLanguage | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const base = normalized.split("-")[0];
  return isSupportedLanguage(base) ? base : null;
}

export function stripLanguagePrefix(pathname: string): {
  langFromPath: AppLanguage | null;
  strippedPathname: string;
} {
  const segments = pathname.split("/");
  const first = normalizeLanguageTag(segments[1] ?? "");
  if (!first) {
    return {
      langFromPath: null,
      strippedPathname: pathname
    };
  }

  const rest = segments.slice(2).join("/");
  return {
    langFromPath: first,
    strippedPathname: rest ? `/${rest}` : "/"
  };
}

export function pickLanguageFromAcceptLanguage(rawHeader: string | null | undefined): AppLanguage | null {
  const raw = rawHeader?.trim();
  if (!raw) {
    return null;
  }

  const parsed = raw
    .split(",")
    .map((part) => {
      const [tagPart, ...params] = part.trim().split(";");
      const lang = normalizeLanguageTag(tagPart);
      if (!lang) {
        return null;
      }

      const qPart = params.find((param) => param.trim().startsWith("q="));
      const q = qPart ? Number.parseFloat(qPart.split("=")[1]) : 1;
      const quality = Number.isFinite(q) ? q : 0;

      return { lang, quality };
    })
    .filter((entry): entry is { lang: AppLanguage; quality: number } => Boolean(entry))
    .sort((left, right) => right.quality - left.quality);

  return parsed[0]?.lang ?? null;
}

export function resolveLanguage(pathname: string, acceptLanguage: string | null | undefined): {
  lang: AppLanguage;
  source: "url" | "header" | "fallback";
  urlPrefix: AppLanguage | null;
  strippedPathname: string;
} {
  const { langFromPath, strippedPathname } = stripLanguagePrefix(pathname);
  if (langFromPath) {
    return {
      lang: langFromPath,
      source: "url",
      urlPrefix: langFromPath,
      strippedPathname
    };
  }

  const fromHeader = pickLanguageFromAcceptLanguage(acceptLanguage);
  if (fromHeader) {
    return {
      lang: fromHeader,
      source: "header",
      urlPrefix: null,
      strippedPathname: pathname
    };
  }

  return {
    lang: DEFAULT_LANGUAGE,
    source: "fallback",
    urlPrefix: null,
    strippedPathname: pathname
  };
}

export function withLanguagePrefix(pathname: string, prefix: AppLanguage | null): string {
  if (!prefix) {
    return pathname;
  }
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalizedPath === "/") {
    return `/${prefix}`;
  }
  if (normalizedPath.startsWith(`/${prefix}/`) || normalizedPath === `/${prefix}`) {
    return normalizedPath;
  }
  return `/${prefix}${normalizedPath}`;
}
