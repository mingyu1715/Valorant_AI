import type { NextRequest } from "next/server";
import { headers } from "next/headers";

import {
  DEFAULT_LANGUAGE,
  REQUEST_LANG_HEADER,
  REQUEST_LANG_PREFIX_HEADER,
  normalizeLanguageTag,
  type AppLanguage
} from "@/src/i18n/config";

function readLanguageFromHeaders(source: Headers): AppLanguage {
  const raw = source.get(REQUEST_LANG_HEADER);
  const parsed = raw ? normalizeLanguageTag(raw) : null;
  return parsed ?? DEFAULT_LANGUAGE;
}

function readPrefixFromHeaders(source: Headers): AppLanguage | null {
  const raw = source.get(REQUEST_LANG_PREFIX_HEADER);
  return raw ? normalizeLanguageTag(raw) : null;
}

export function getRequestLanguage(request: Pick<NextRequest, "headers">): AppLanguage {
  return readLanguageFromHeaders(request.headers);
}

export function getRequestLanguageContext(request: Pick<NextRequest, "headers">): {
  lang: AppLanguage;
  prefix: AppLanguage | null;
} {
  return {
    lang: readLanguageFromHeaders(request.headers),
    prefix: readPrefixFromHeaders(request.headers)
  };
}

export async function getServerLanguageContext(): Promise<{
  lang: AppLanguage;
  prefix: AppLanguage | null;
}> {
  const source = await headers();
  return {
    lang: readLanguageFromHeaders(source),
    prefix: readPrefixFromHeaders(source)
  };
}
