import { NextRequest, NextResponse } from "next/server";

import { requireSession, resolveSessionPuuid, UnauthorizedError } from "@/src/server/auth/guards";
import { syncRecentMatchesForUser } from "@/src/server/match-sync/service";
import { logError, maskPuuid } from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let resolvedPuuid = "";
  try {
    const session = await requireSession(request);
    const puuid = await resolveSessionPuuid(session);
    resolvedPuuid = puuid;
    const matchSyncResult = await syncRecentMatchesForUser({
      puuid
    });
    return NextResponse.json(matchSyncResult, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logError("match-sync", "내 경기 동기화 API 요청이 실패했습니다.", {
      path: request.nextUrl.pathname,
      puuid: maskPuuid(resolvedPuuid),
      error: detail
    });
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "내 경기 동기화 중 오류가 발생했습니다." }, { status: 500 });
  }
}
