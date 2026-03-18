import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { getIntEnv } from "@/src/server/shared";
import { getAuthSessionStore } from "@/src/server/auth/session-store";
import type { AuthSessionRecord, RiotAuthIdentity, RiotAuthProviderKind } from "@/src/server/auth/types";

export const RIOT_AUTH_SESSION_COOKIE = "valorant_auth_session";
export const RIOT_AUTH_FLOW_COOKIE = "valorant_riot_auth_flow";

const DEFAULT_AUTH_SESSION_TTL_SECONDS = 60 * 60 * 8;
const DEFAULT_AUTH_FLOW_TTL_SECONDS = 60 * 10;

type CookieValue = {
  value: string;
};

type CookieReader = {
  get(name: string): CookieValue | undefined;
};

export interface RiotAuthFlowState {
  state: string;
  provider: RiotAuthProviderKind;
  createdAt: number;
}

function getSessionTtlSeconds(): number {
  return Math.max(60, getIntEnv("RIOT_AUTH_SESSION_TTL_SECONDS", DEFAULT_AUTH_SESSION_TTL_SECONDS));
}

function getFlowTtlSeconds(): number {
  return Math.max(60, getIntEnv("RIOT_AUTH_FLOW_TTL_SECONDS", DEFAULT_AUTH_FLOW_TTL_SECONDS));
}

export function getAuthSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    priority: "high" as const,
    maxAge: getSessionTtlSeconds()
  };
}

export function getAuthFlowCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    priority: "high" as const,
    maxAge: getFlowTtlSeconds()
  };
}

function safeBase64Decode(raw: string): string {
  return Buffer.from(raw, "base64url").toString("utf8");
}

export function serializeAuthFlowState(flow: RiotAuthFlowState): string {
  return Buffer.from(JSON.stringify(flow), "utf8").toString("base64url");
}

export function parseAuthFlowState(rawValue?: string): RiotAuthFlowState | null {
  if (!rawValue) {
    return null;
  }

  try {
    const decoded = safeBase64Decode(rawValue);
    const parsed = JSON.parse(decoded) as Partial<RiotAuthFlowState>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const state = String(parsed.state ?? "").trim();
    const provider = parsed.provider === "real" ? "real" : parsed.provider === "mock" ? "mock" : null;
    const createdAt = Number(parsed.createdAt ?? 0);
    if (!state || !provider || !Number.isFinite(createdAt)) {
      return null;
    }

    return {
      state,
      provider,
      createdAt
    };
  } catch {
    return null;
  }
}

export function isAuthFlowStateExpired(flow: RiotAuthFlowState, now = Date.now()): boolean {
  return flow.createdAt + getFlowTtlSeconds() * 1000 < now;
}

export function readAuthSessionId(cookies: CookieReader): string | null {
  const value = cookies.get(RIOT_AUTH_SESSION_COOKIE)?.value?.trim();
  return value || null;
}

export async function createAuthSession(identity: RiotAuthIdentity): Promise<AuthSessionRecord> {
  const createdAt = Date.now();
  const maxAgeMs = getSessionTtlSeconds() * 1000;
  const session: AuthSessionRecord = {
    sessionId: randomUUID(),
    puuid: identity.puuid,
    gameName: identity.gameName,
    tagLine: identity.tagLine,
    provider: identity.provider,
    createdAt,
    expiresAt: createdAt + maxAgeMs
  };

  await getAuthSessionStore().create(session);
  return session;
}

export async function getAuthSessionById(sessionId: string): Promise<AuthSessionRecord | null> {
  if (!sessionId) {
    return null;
  }

  const store = getAuthSessionStore();
  const session = await store.getById(sessionId);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    await store.deleteById(sessionId);
    return null;
  }

  return session;
}

export async function getAuthSessionFromRequest(request: NextRequest): Promise<AuthSessionRecord | null> {
  const sessionId = readAuthSessionId(request.cookies);
  if (!sessionId) {
    return null;
  }

  return getAuthSessionById(sessionId);
}

export async function revokeAuthSession(sessionId?: string | null): Promise<void> {
  if (!sessionId) {
    return;
  }
  await getAuthSessionStore().deleteById(sessionId);
}
