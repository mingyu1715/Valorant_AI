import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getPostLoginRedirectUrl, getRiotAuthCallbackUrl } from "@/src/server/auth/config";
import { getRiotAuthProvider } from "@/src/server/auth/provider";
import { RIOT_AUTH_FLOW_COOKIE, getAuthFlowCookieOptions, serializeAuthFlowState } from "@/src/server/auth/session";
import { AppError } from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToDashboardWithState(request: NextRequest, authState: string): NextResponse {
  return NextResponse.redirect(getPostLoginRedirectUrl(request, authState));
}

export async function GET(request: NextRequest) {
  const state = randomUUID();

  try {
    const provider = getRiotAuthProvider();
    const callbackUrl = getRiotAuthCallbackUrl(request);
    const authorizationUrl = await provider.createAuthorizationUrl({
      state,
      callbackUrl,
      requestUrl: request.url
    });

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(
      RIOT_AUTH_FLOW_COOKIE,
      serializeAuthFlowState({
        state,
        provider: provider.kind,
        createdAt: Date.now()
      }),
      getAuthFlowCookieOptions()
    );
    return response;
  } catch (error) {
    if (error instanceof AppError && error.message.includes("production 환경에서는")) {
      return redirectToDashboardWithState(request, "mock_not_allowed_in_production");
    }
    return redirectToDashboardWithState(request, error instanceof AppError ? "missing_rso_config" : "auth_start_failed");
  }
}
