import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getEnv } from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = getEnv("RIOT_RSO_CLIENT_ID");
  const redirectUri = getEnv("RIOT_RSO_REDIRECT_URI");
  const scope = getEnv("RIOT_RSO_SCOPE", "openid offline_access");

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/dashboard?rso=missing_rso_config", request.url));
  }

  const state = randomUUID();
  const authorizeUrl = new URL("https://auth.riotgames.com/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("riot_rso_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10
  });
  return response;
}
