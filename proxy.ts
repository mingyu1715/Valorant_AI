import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  REQUEST_LANG_HEADER,
  REQUEST_LANG_PREFIX_HEADER,
  REQUEST_LANG_SOURCE_HEADER,
  resolveLanguage
} from "@/src/i18n/config";

function withLanguageHeaders(request: NextRequest, lang: string, source: string, prefix: string): Headers {
  const headers = new Headers(request.headers);
  headers.set(REQUEST_LANG_HEADER, lang);
  headers.set(REQUEST_LANG_SOURCE_HEADER, source);
  headers.set(REQUEST_LANG_PREFIX_HEADER, prefix);
  return headers;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const resolved = resolveLanguage(pathname, request.headers.get("accept-language"));
  const prefix = resolved.urlPrefix ?? "";
  const requestHeaders = withLanguageHeaders(request, resolved.lang, resolved.source, prefix);

  if (resolved.urlPrefix) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = resolved.strippedPathname;
    return NextResponse.rewrite(rewritten, {
      request: {
        headers: requestHeaders
      }
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"
  ]
};
