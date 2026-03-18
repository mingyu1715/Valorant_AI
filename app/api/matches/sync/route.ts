import { NextRequest, NextResponse } from "next/server";

import { getAuthSessionFromRequest } from "@/src/server/auth/session";
import { syncRecentMatchesForUser } from "@/src/server/match-sync/service";
import { AppError, logError } from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const result = await syncRecentMatchesForUser({
      puuid: session.puuid
    });
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "내 경기 동기화 중 오류가 발생했습니다.";
    logError("match-sync", "내 경기 동기화 API 요청이 실패했습니다.", {
      path: request.nextUrl.pathname,
      puuid: session.puuid,
      error: message
    });
    return NextResponse.json({ error: message }, { status: error instanceof AppError ? 400 : 500 });
  }
}
