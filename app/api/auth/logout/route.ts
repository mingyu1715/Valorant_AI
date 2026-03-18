import { NextRequest, NextResponse } from "next/server";

import { getPostLogoutRedirectUrl } from "@/src/server/auth/config";
import {
  RIOT_AUTH_FLOW_COOKIE,
  RIOT_AUTH_SESSION_COOKIE,
  readAuthSessionId,
  revokeAuthSession
} from "@/src/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

async function clearSessionFromRequest(request: NextRequest): Promise<void> {
  const sessionId = readAuthSessionId(request.cookies);
  await revokeAuthSession(sessionId);
}

export async function GET(request: NextRequest) {
  await clearSessionFromRequest(request);
  const response = NextResponse.redirect(getPostLogoutRedirectUrl(request, "logout_success"));
  response.cookies.delete(RIOT_AUTH_SESSION_COOKIE);
  response.cookies.delete(RIOT_AUTH_FLOW_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  await clearSessionFromRequest(request);
  const response = jsonResponse({ ok: true });
  response.cookies.delete(RIOT_AUTH_SESSION_COOKIE);
  response.cookies.delete(RIOT_AUTH_FLOW_COOKIE);
  return response;
}
