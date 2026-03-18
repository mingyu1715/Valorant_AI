import type { NextRequest } from "next/server";

import { getEnv } from "@/src/server/shared";

function toUrl(value: string, request: NextRequest): URL {
  try {
    return new URL(value);
  } catch {
    return new URL(value, request.url);
  }
}

function appendAuthState(url: URL, authState: string): URL {
  const next = new URL(url.toString());
  if (authState) {
    next.searchParams.set("rso", authState);
  }
  return next;
}

export function getRiotAuthCallbackUrl(request: NextRequest): string {
  const configured = getEnv("RIOT_RSO_REDIRECT_URI");
  if (configured) {
    return toUrl(configured, request).toString();
  }

  return new URL("/api/auth/riot/callback", request.url).toString();
}

export function getPostLoginRedirectUrl(request: NextRequest, authState = ""): URL {
  const configured = getEnv("RIOT_AUTH_POST_LOGIN_REDIRECT_URI");
  const base = configured ? toUrl(configured, request) : new URL("/dashboard", request.url);
  return appendAuthState(base, authState);
}

export function getPostLogoutRedirectUrl(request: NextRequest, authState = ""): URL {
  const configured = getEnv("RIOT_AUTH_POST_LOGOUT_REDIRECT_URI");
  const base = configured ? toUrl(configured, request) : new URL("/", request.url);
  return appendAuthState(base, authState);
}
