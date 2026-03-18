import { NextRequest, NextResponse } from "next/server";

import { getAuthSessionFromRequest } from "@/src/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSessionFromRequest(request);
    return NextResponse.json(
      {
        authenticated: Boolean(session),
        session: session
          ? {
              puuid: session.puuid,
              gameName: session.gameName,
              tagLine: session.tagLine,
              provider: session.provider,
              expiresAt: session.expiresAt
            }
          : null
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        session: null
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
