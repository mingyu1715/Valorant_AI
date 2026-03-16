import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  MAX_LOG_ENTRIES,
  getLogSnapshot,
  hasAdminAccessConfigured,
  isAdminSessionAuthorized,
  safeInt
} from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!hasAdminAccessConfigured()) {
    return NextResponse.json({ error: "관리자 로그 콘솔이 비활성화되어 있습니다." }, { status: 404 });
  }

  const sessionValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionAuthorized(sessionValue)) {
    return NextResponse.json(
      {
        error: "관리자 인증이 필요합니다."
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const rawLimit = request.nextUrl.searchParams.get("limit") ?? "200";
  const limit = Math.max(1, Math.min(safeInt(rawLimit, 200), MAX_LOG_ENTRIES));
  return NextResponse.json(
    {
      logs: getLogSnapshot(limit)
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
