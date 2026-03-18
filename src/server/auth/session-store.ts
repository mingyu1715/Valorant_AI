import { AppError, getEnv } from "@/src/server/shared";
import type { AuthSessionRecord, AuthSessionStore } from "@/src/server/auth/types";

type AuthSessionStoreKind = "memory" | "db";

declare global {
  // eslint-disable-next-line no-var
  var __valorantAuthSessionMap: Map<string, AuthSessionRecord> | undefined;
}

function getInMemorySessionMap(): Map<string, AuthSessionRecord> {
  if (!globalThis.__valorantAuthSessionMap) {
    globalThis.__valorantAuthSessionMap = new Map<string, AuthSessionRecord>();
  }
  return globalThis.__valorantAuthSessionMap;
}

class InMemoryAuthSessionStore implements AuthSessionStore {
  async create(record: AuthSessionRecord): Promise<void> {
    getInMemorySessionMap().set(record.sessionId, record);
  }

  async getById(sessionId: string): Promise<AuthSessionRecord | null> {
    const item = getInMemorySessionMap().get(sessionId);
    return item ? structuredClone(item) : null;
  }

  async deleteById(sessionId: string): Promise<void> {
    getInMemorySessionMap().delete(sessionId);
  }
}

class DbAuthSessionStore implements AuthSessionStore {
  async create(record: AuthSessionRecord): Promise<void> {
    try {
      const { authRepository } = await import("@/src/server/db/repositories");
      await authRepository.createSessionFromAuthRecord({
        authSession: record
      });
    } catch {
      throw new AppError("DB 세션 저장에 실패했습니다. DATABASE_URL과 Prisma 마이그레이션 상태를 확인해 주세요.");
    }
  }

  async getById(sessionId: string): Promise<AuthSessionRecord | null> {
    try {
      const { authRepository } = await import("@/src/server/db/repositories");
      const session = await authRepository.findActiveSessionByToken(sessionId);
      if (!session) {
        return null;
      }
      return authRepository.toAuthSessionRecord(session, sessionId);
    } catch {
      throw new AppError("DB 세션 조회에 실패했습니다. DATABASE_URL과 Prisma 마이그레이션 상태를 확인해 주세요.");
    }
  }

  async deleteById(sessionId: string): Promise<void> {
    try {
      const { authRepository } = await import("@/src/server/db/repositories");
      await authRepository.revokeSessionByToken(sessionId);
    } catch {
      throw new AppError("DB 세션 종료에 실패했습니다. DATABASE_URL과 Prisma 마이그레이션 상태를 확인해 주세요.");
    }
  }
}

const inMemoryStore = new InMemoryAuthSessionStore();
const dbStore = new DbAuthSessionStore();

export function getConfiguredAuthSessionStoreKind(): AuthSessionStoreKind {
  const raw = getEnv("AUTH_SESSION_STORE", "memory").toLowerCase();
  return raw === "db" ? "db" : "memory";
}

export function getAuthSessionStore(): AuthSessionStore {
  return getConfiguredAuthSessionStoreKind() === "db" ? dbStore : inMemoryStore;
}
