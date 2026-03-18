import { NextRequest, NextResponse } from "next/server";

import { createAnalysisJob, getJobSnapshot } from "@/src/server/jobs";
import { getAuthSessionFromRequest } from "@/src/server/auth/session";
import {
  AppError,
  DEFAULT_ANALYZE_RATE_LIMIT_MAX,
  DEFAULT_ANALYZE_RATE_LIMIT_WINDOW_SECONDS,
  consumeRateLimit,
  getClientIp,
  getIntEnv,
  logError,
  sanitizeLogValue
} from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId 쿼리가 필요합니다." }, { status: 400 });
  }

  const snapshot = getJobSnapshot(jobId);
  if (!snapshot) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: NextRequest) {
  // 테스트용: ?error=true로 에러 페이지 테스트
  if (request.nextUrl.searchParams.get("error") === "true") {
    throw new Error("테스트 에러: 에러 페이지 표시를 위한 의도적인 오류입니다.");
  }

  let requestBody: Record<string, unknown> = {};

  try {
    const rateLimit = consumeRateLimit(
      `analyze:${getClientIp(request.headers)}`,
      getIntEnv("ANALYZE_RATE_LIMIT_MAX", DEFAULT_ANALYZE_RATE_LIMIT_MAX),
      getIntEnv("ANALYZE_RATE_LIMIT_WINDOW_SECONDS", DEFAULT_ANALYZE_RATE_LIMIT_WINDOW_SECONDS)
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `분석 요청이 너무 많습니다. ${rateLimit.retryAfterSeconds}초 후 다시 시도해 주세요.`
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rateLimit.retryAfterSeconds)
          }
        }
      );
    }

    try {
      requestBody = (await request.json()) as Record<string, unknown>;
    } catch {
      requestBody = {};
    }
    const bodyRiotId = String(requestBody.riotId ?? "").trim();
    const bodyRiotTag = String(requestBody.riotTag ?? "").trim();
    const session = await getAuthSessionFromRequest(request);
    const effectiveRiotId = bodyRiotId || session?.gameName;
    const effectiveRiotTag = bodyRiotTag || session?.tagLine;
    // TODO(phase-2): createAnalysisJob이 puuid를 직접 받도록 확장해 본인 계정 분석을 강제합니다.
    const snapshot = createAnalysisJob(effectiveRiotId, effectiveRiotTag);
    return NextResponse.json(snapshot, {
      status: 202,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof AppError ? error.message : "요청 처리 중 오류가 발생했습니다.";
    logError("web", "/api/analyze 요청 처리에 실패했습니다.", {
      path: request.nextUrl.pathname,
      method: request.method,
      body: sanitizeLogValue(requestBody),
      error: message
    });
    return NextResponse.json({ error: message }, { status: error instanceof AppError ? 400 : 500 });
  }
}
