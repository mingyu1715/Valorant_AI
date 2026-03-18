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
    void record;
    // TODO(phase-2): DB 세션 테이블 insert 구현
    throw new AppError("DB 세션 저장소는 아직 연결되지 않았습니다. AUTH_SESSION_STORE=memory를 사용해 주세요.");
  }

  async getById(sessionId: string): Promise<AuthSessionRecord | null> {
    void sessionId;
    // TODO(phase-2): DB 세션 테이블 select 구현
    throw new AppError("DB 세션 저장소는 아직 연결되지 않았습니다. AUTH_SESSION_STORE=memory를 사용해 주세요.");
  }

  async deleteById(sessionId: string): Promise<void> {
    void sessionId;
    // TODO(phase-2): DB 세션 테이블 delete 구현
    throw new AppError("DB 세션 저장소는 아직 연결되지 않았습니다. AUTH_SESSION_STORE=memory를 사용해 주세요.");
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
