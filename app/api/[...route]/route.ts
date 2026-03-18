import type { NextRequest } from "next/server";

import { dispatchApiRequest } from "@/src/server/api/router";

type RouteContext = {
  params: Promise<{ route: string[] }>;
};

async function resolveRouteParts(context: RouteContext): Promise<string[]> {
  const resolved = await context.params;
  return Array.isArray(resolved.route) ? resolved.route : [];
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  return dispatchApiRequest(request, await resolveRouteParts(context));
}

export async function POST(request: NextRequest, context: RouteContext) {
  return dispatchApiRequest(request, await resolveRouteParts(context));
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return dispatchApiRequest(request, await resolveRouteParts(context));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return dispatchApiRequest(request, await resolveRouteParts(context));
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return dispatchApiRequest(request, await resolveRouteParts(context));
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return dispatchApiRequest(request, await resolveRouteParts(context));
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return dispatchApiRequest(request, await resolveRouteParts(context));
}
