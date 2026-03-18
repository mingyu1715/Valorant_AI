import { NextRequest, NextResponse } from "next/server";

import { getPostLoginRedirectUrl, getRiotAuthCallbackUrl } from "@/src/server/auth/config";
import { getRiotAuthProvider } from "@/src/server/auth/provider";
import {
  RIOT_AUTH_FLOW_COOKIE,
  RIOT_AUTH_SESSION_COOKIE,
  createAuthSession,
  getAuthSessionCookieOptions,
  parseAuthFlowState
} from "@/src/server/auth/session";
import { AppError } from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithState(request: NextRequest, authState: string): NextResponse {
  const response = NextResponse.redirect(getPostLoginRedirectUrl(request, authState));
  response.cookies.delete(RIOT_AUTH_FLOW_COOKIE);
  return response;
}

function callbackErrorState(error: unknown): string {
  if (error instanceof AppError && error.message.includes("아직 구현되지 않았습니다")) {
    return "real_provider_not_ready";
  }
  return "auth_callback_failed";
}

export async function GET(request: NextRequest) {
  const oauthError = request.nextUrl.searchParams.get("error")?.trim();
  if (oauthError) {
    return redirectWithState(request, oauthError);
  }

  const state = request.nextUrl.searchParams.get("state")?.trim();
  if (!state) {
    return redirectWithState(request, "missing_state");
  }

  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return redirectWithState(request, "missing_code");
  }

  const flow = parseAuthFlowState(request.cookies.get(RIOT_AUTH_FLOW_COOKIE)?.value);
  if (!flow || flow.state !== state) {
    return redirectWithState(request, "state_mismatch");
  }

  const provider = getRiotAuthProvider(flow.provider);

  try {
    const identity = await provider.resolveIdentityFromCallback({
      code,
      state,
      callbackUrl: getRiotAuthCallbackUrl(request),
      requestUrl: request.url
    });
    const session = await createAuthSession(identity);

    const response = NextResponse.redirect(getPostLoginRedirectUrl(request, "login_success"));
    response.cookies.set(RIOT_AUTH_SESSION_COOKIE, session.sessionId, getAuthSessionCookieOptions());
    response.cookies.delete(RIOT_AUTH_FLOW_COOKIE);
    return response;
  } catch (error) {
    return redirectWithState(request, callbackErrorState(error));
  }
}
