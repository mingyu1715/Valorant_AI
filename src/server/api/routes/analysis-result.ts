import { NextRequest, NextResponse } from "next/server";

import { generateSessionAnalysisResult } from "@/src/server/analysis/session-analysis";
import { requireSession, resolveSessionPuuid, UnauthorizedError } from "@/src/server/auth/guards";
import { DEFAULT_FEATURE_VERSION, DEFAULT_FEATURE_WINDOW } from "@/src/server/features/extractor";
import { logError, maskPuuid } from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function POST(request: NextRequest) {
  let analysisRequestBody: Record<string, unknown> = {};
  try {
    analysisRequestBody = (await request.json()) as Record<string, unknown>;
  } catch {
    analysisRequestBody = {};
  }

  const window = String(analysisRequestBody.window ?? DEFAULT_FEATURE_WINDOW).trim() || DEFAULT_FEATURE_WINDOW;
  const version = String(analysisRequestBody.version ?? DEFAULT_FEATURE_VERSION).trim() || DEFAULT_FEATURE_VERSION;
  const limit = Math.min(toPositiveInt(analysisRequestBody.limit, 20), 100);
  const useCache = analysisRequestBody.useCache === undefined ? true : Boolean(analysisRequestBody.useCache);
  let resolvedPuuid = "";

  try {
    const session = await requireSession(request);
    resolvedPuuid = await resolveSessionPuuid(session);
    const analysisResult = await generateSessionAnalysisResult({
      puuid: resolvedPuuid,
      window,
      version,
      limit,
      useCache
    });

    return NextResponse.json(
      {
        ok: true,
        analysis: analysisResult
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logError("analysis-result", "analysis result API 요청이 실패했습니다.", {
      path: request.nextUrl.pathname,
      puuid: resolvedPuuid ? maskPuuid(resolvedPuuid) : "unauthenticated",
      window,
      version,
      limit,
      useCache,
      error: detail
    });
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "최종 분석 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const window = request.nextUrl.searchParams.get("window")?.trim() || DEFAULT_FEATURE_WINDOW;
  const version = request.nextUrl.searchParams.get("version")?.trim() || DEFAULT_FEATURE_VERSION;
  const limit = Math.min(toPositiveInt(request.nextUrl.searchParams.get("limit"), 20), 100);
  const useCacheRaw = request.nextUrl.searchParams.get("useCache");
  const useCache = useCacheRaw === null ? true : useCacheRaw !== "false";
  let resolvedPuuid = "";

  try {
    const session = await requireSession(request);
    resolvedPuuid = await resolveSessionPuuid(session);
    const analysisResult = await generateSessionAnalysisResult({
      puuid: resolvedPuuid,
      window,
      version,
      limit,
      useCache
    });

    return NextResponse.json(
      {
        ok: true,
        analysis: analysisResult
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logError("analysis-result", "analysis result GET 요청이 실패했습니다.", {
      path: request.nextUrl.pathname,
      puuid: resolvedPuuid ? maskPuuid(resolvedPuuid) : "unauthenticated",
      window,
      version,
      limit,
      useCache,
      error: detail
    });
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "최종 분석 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
