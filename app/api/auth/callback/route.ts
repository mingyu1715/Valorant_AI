import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/dashboard?rso=${encodeURIComponent(error)}`, request.url));
  }

  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const storedState = request.cookies.get("riot_rso_state")?.value;

  if (!state || !storedState || state !== storedState) {
    const response = NextResponse.redirect(new URL("/dashboard?rso=state_mismatch", request.url));
    response.cookies.delete("riot_rso_state");
    return response;
  }

  const response = NextResponse.redirect(
    new URL(code ? "/dashboard?rso=code_received" : "/dashboard?rso=missing_code", request.url)
  );
  response.cookies.delete("riot_rso_state");
  return response;
}
