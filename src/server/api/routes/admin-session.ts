import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  DEFAULT_ADMIN_LOGIN_RATE_LIMIT_MAX,
  DEFAULT_ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  consumeRateLimit,
  createAdminSessionValue,
  getAdminSessionCookieOptions,
  getClientIp,
  getIntEnv,
  hasAdminAccessConfigured,
  isAdminTokenValid
} from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(extraHeaders ?? {})
    }
  });
}

export async function POST(request: NextRequest) {
  if (!hasAdminAccessConfigured()) {
    return jsonResponse({ error: "관리자 로그 콘솔이 비활성화되어 있습니다." }, 404);
  }

  const rateLimit = consumeRateLimit(
    `admin-session:${getClientIp(request.headers)}`,
    getIntEnv("ADMIN_LOGIN_RATE_LIMIT_MAX", DEFAULT_ADMIN_LOGIN_RATE_LIMIT_MAX),
    getIntEnv("ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS", DEFAULT_ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS)
  );
  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        error: `관리자 인증 시도가 너무 많습니다. ${rateLimit.retryAfterSeconds}초 후 다시 시도해 주세요.`
      },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    );
  }

  let requestBody: Record<string, unknown> = {};
  try {
    requestBody = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "JSON 본문 형식이 잘못되었습니다." }, 400);
  }

  const token = String(requestBody.token ?? "").trim();
  if (!isAdminTokenValid(token)) {
    return jsonResponse({ error: "관리자 토큰이 올바르지 않습니다." }, 401);
  }

  const response = jsonResponse({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionValue(token), getAdminSessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = jsonResponse({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
