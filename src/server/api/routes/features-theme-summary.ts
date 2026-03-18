import { NextRequest, NextResponse } from "next/server";

import { requireSession, resolveSessionPuuid, UnauthorizedError } from "@/src/server/auth/guards";
import { DEFAULT_FEATURE_VERSION, DEFAULT_FEATURE_WINDOW } from "@/src/server/features/extractor";
import { extractAndSaveFeaturesForPlayerFromDb } from "@/src/server/features/service";
import { buildThemeFeaturePayloadMap } from "@/src/server/theme-payloads/builder";
import { logError, maskPuuid } from "@/src/server/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  const window = request.nextUrl.searchParams.get("window")?.trim() || DEFAULT_FEATURE_WINDOW;
  const version = request.nextUrl.searchParams.get("version")?.trim() || DEFAULT_FEATURE_VERSION;
  const limit = Math.min(toPositiveInt(request.nextUrl.searchParams.get("limit"), 20), 100);
  let resolvedPuuid = "";

  try {
    const session = await requireSession(request);
    const puuid = await resolveSessionPuuid(session);
    resolvedPuuid = puuid;
    const featureExtractionResult = await extractAndSaveFeaturesForPlayerFromDb(puuid, {
      window,
      version,
      limit
    });
    const themeFeaturePayloadMap = buildThemeFeaturePayloadMap(featureExtractionResult.aggregate);

    return NextResponse.json(
      {
        ok: true,
        puuid: featureExtractionResult.puuid,
        window,
        version,
        themeFeatures: themeFeaturePayloadMap
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logError("theme-summary", "theme summary API 요청이 실패했습니다.", {
      path: request.nextUrl.pathname,
      puuid: maskPuuid(resolvedPuuid),
      window,
      version,
      limit,
      error: detail
    });
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "theme summary 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
