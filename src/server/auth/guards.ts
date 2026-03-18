import type { NextRequest } from "next/server";

import { AppError } from "@/src/server/shared";
import { getAuthSessionFromRequest } from "@/src/server/auth/session";
import type { AuthSessionRecord } from "@/src/server/auth/types";

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;

  constructor(message = "로그인이 필요합니다.") {
    super(message);
  }
}

export function assertAuthenticated(session: AuthSessionRecord | null): asserts session is AuthSessionRecord {
  if (!session) {
    throw new UnauthorizedError();
  }
}

export async function getSessionUser(request: NextRequest): Promise<AuthSessionRecord | null> {
  return getAuthSessionFromRequest(request);
}

export async function requireSession(request: NextRequest): Promise<AuthSessionRecord> {
  const session = await getSessionUser(request);
  assertAuthenticated(session);
  return session;
}

export async function resolveSessionPuuid(session: AuthSessionRecord): Promise<string> {
  const fallbackPuuid = session.puuid.trim();
  const userId = session.userId?.trim();

  if (userId) {
    try {
      const { authRepository } = await import("@/src/server/db/repositories");
      const account = await authRepository.findRiotAccountByUserId(userId);
      const dbPuuid = account?.puuid?.trim() ?? "";
      if (!dbPuuid) {
        throw new UnauthorizedError("세션 계정 정보를 확인할 수 없습니다.");
      }
      return dbPuuid;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new AppError("세션 계정 조회 중 오류가 발생했습니다.");
    }
  }

  if (!fallbackPuuid) {
    throw new UnauthorizedError("세션 사용자 식별자가 유효하지 않습니다.");
  }

  return fallbackPuuid;
}
