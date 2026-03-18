import { NextRequest, NextResponse } from "next/server";

import * as adminLogsRoute from "@/src/server/api/routes/admin-logs";
import * as adminSessionRoute from "@/src/server/api/routes/admin-session";
import * as analysisResultRoute from "@/src/server/api/routes/analysis-result";
import * as authLogoutRoute from "@/src/server/api/routes/auth-logout";
import * as authRiotCallbackRoute from "@/src/server/api/routes/auth-riot-callback";
import * as authRiotStartRoute from "@/src/server/api/routes/auth-riot-start";
import * as authSessionRoute from "@/src/server/api/routes/auth-session";
import * as featureSnapshotRoute from "@/src/server/api/routes/features-snapshot";
import * as featureThemeSummaryRoute from "@/src/server/api/routes/features-theme-summary";
import * as matchesSyncRoute from "@/src/server/api/routes/matches-sync";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
type RouteHandler = (request: NextRequest) => Promise<NextResponse>;
type RouteModule = Partial<Record<HttpMethod, RouteHandler>>;

export const API_RUNTIME = "nodejs";
export const API_DYNAMIC = "force-dynamic";

const ROUTE_MAP: Record<string, RouteModule> = {
  "/admin/logs": adminLogsRoute,
  "/admin/session": adminSessionRoute,
  "/analysis/result": analysisResultRoute,
  "/auth/logout": authLogoutRoute,
  "/auth/riot/callback": authRiotCallbackRoute,
  "/auth/riot/start": authRiotStartRoute,
  "/auth/session": authSessionRoute,
  "/features/snapshot": featureSnapshotRoute,
  "/features/theme-summary": featureThemeSummaryRoute,
  "/matches/sync": matchesSyncRoute
};

function normalizeRoutePath(routeParts: string[]): string {
  const joined = routeParts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
  return `/${joined}`;
}

function readAllowedMethods(routeModule: RouteModule): HttpMethod[] {
  return (Object.keys(routeModule) as HttpMethod[]).filter((method) => typeof routeModule[method] === "function");
}

function methodNotAllowed(allowedMethods: HttpMethod[]): NextResponse {
  const allow = allowedMethods.join(", ");
  return NextResponse.json(
    {
      error: "허용되지 않은 HTTP 메서드입니다."
    },
    {
      status: 405,
      headers: {
        Allow: allow,
        "Cache-Control": "no-store"
      }
    }
  );
}

function routeNotFound(): NextResponse {
  return NextResponse.json(
    {
      error: "요청한 API 경로를 찾을 수 없습니다."
    },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function dispatchApiRequest(request: NextRequest, routeParts: string[]): Promise<NextResponse> {
  const path = normalizeRoutePath(routeParts);
  const routeModule = ROUTE_MAP[path];

  if (!routeModule) {
    return routeNotFound();
  }

  const method = request.method.toUpperCase() as HttpMethod;
  const handler = routeModule[method];
  if (!handler) {
    return methodNotAllowed(readAllowedMethods(routeModule));
  }

  return handler(request);
}
