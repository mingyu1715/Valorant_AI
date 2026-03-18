import { createHash } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import type { AuthSessionRecord, RiotAuthIdentity } from "@/src/server/auth/types";
import { prisma } from "@/src/server/db/client";

type JsonInput = Prisma.InputJsonValue;

type DbSessionRecord = {
  id: string;
  createdAt: Date;
  userId: string;
  riotAccountId: string | null;
  sessionTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  metadataJson: unknown;
  riotAccount?: {
    puuid: string;
    gameName: string;
    tagLine: string;
    provider: string;
  } | null;
};

type DbRiotAccountRecord = {
  id: string;
  userId: string;
  puuid: string;
  gameName: string;
  tagLine: string;
};

type DbClientLike = {
  user: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  riotAccount: {
    findUnique: (args: unknown) => Promise<DbRiotAccountRecord | null>;
    findFirst: (args: unknown) => Promise<DbRiotAccountRecord | null>;
    upsert: (args: unknown) => Promise<DbRiotAccountRecord>;
  };
  session: {
    create: (args: unknown) => Promise<DbSessionRecord>;
    findFirst: (args: unknown) => Promise<DbSessionRecord | null>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
  $transaction: <T>(fn: (tx: DbClientLike) => Promise<T>) => Promise<T>;
};

export interface EnsureRiotAccountInput {
  identity: RiotAuthIdentity;
  accessTokenEncrypted?: string | null;
  refreshTokenEncrypted?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  tokenMetadataJson?: JsonInput | null;
}

export interface PersistAuthSessionInput {
  authSession: AuthSessionRecord;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadataJson?: JsonInput | null;
}

export function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(`valorant-auth-session:${sessionToken}`).digest("hex");
}

export class AuthRepository {
  private readonly db: DbClientLike;

  constructor(client: PrismaClient = prisma) {
    this.db = client as unknown as DbClientLike;
  }

  async findRiotAccountByPuuid(puuid: string): Promise<DbRiotAccountRecord | null> {
    return this.db.riotAccount.findUnique({
      where: { puuid }
    });
  }

  async findRiotAccountByUserId(userId: string): Promise<DbRiotAccountRecord | null> {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return null;
    }

    return this.db.riotAccount.findFirst({
      where: { userId: normalizedUserId },
      orderBy: { updatedAt: "desc" }
    });
  }

  async ensureUserAndRiotAccount(input: EnsureRiotAccountInput): Promise<DbRiotAccountRecord> {
    const existing = await this.findRiotAccountByPuuid(input.identity.puuid);
    if (existing) {
      return this.db.riotAccount.upsert({
        where: { puuid: input.identity.puuid },
        create: {
          user: {
            create: {}
          },
          puuid: input.identity.puuid,
          gameName: input.identity.gameName,
          tagLine: input.identity.tagLine,
          provider: input.identity.provider,
          accessTokenEncrypted: input.accessTokenEncrypted ?? null,
          refreshTokenEncrypted: input.refreshTokenEncrypted ?? null,
          accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
          refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
          tokenMetadataJson: input.tokenMetadataJson ?? null,
          lastLoginAt: new Date()
        },
        update: {
          gameName: input.identity.gameName,
          tagLine: input.identity.tagLine,
          provider: input.identity.provider,
          accessTokenEncrypted: input.accessTokenEncrypted ?? undefined,
          refreshTokenEncrypted: input.refreshTokenEncrypted ?? undefined,
          accessTokenExpiresAt: input.accessTokenExpiresAt ?? undefined,
          refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? undefined,
          tokenMetadataJson: input.tokenMetadataJson ?? undefined,
          lastLoginAt: new Date()
        }
      });
    }

    return this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {}
      });
      return tx.riotAccount.upsert({
        where: { puuid: input.identity.puuid },
        create: {
          userId: user.id,
          puuid: input.identity.puuid,
          gameName: input.identity.gameName,
          tagLine: input.identity.tagLine,
          provider: input.identity.provider,
          accessTokenEncrypted: input.accessTokenEncrypted ?? null,
          refreshTokenEncrypted: input.refreshTokenEncrypted ?? null,
          accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
          refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
          tokenMetadataJson: input.tokenMetadataJson ?? null,
          lastLoginAt: new Date()
        },
        update: {
          gameName: input.identity.gameName,
          tagLine: input.identity.tagLine,
          provider: input.identity.provider,
          accessTokenEncrypted: input.accessTokenEncrypted ?? undefined,
          refreshTokenEncrypted: input.refreshTokenEncrypted ?? undefined,
          accessTokenExpiresAt: input.accessTokenExpiresAt ?? undefined,
          refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? undefined,
          tokenMetadataJson: input.tokenMetadataJson ?? undefined,
          lastLoginAt: new Date()
        }
      });
    });
  }

  async createSessionFromAuthRecord(input: PersistAuthSessionInput): Promise<DbSessionRecord> {
    const riotAccount = await this.ensureUserAndRiotAccount({
      identity: {
        puuid: input.authSession.puuid,
        gameName: input.authSession.gameName,
        tagLine: input.authSession.tagLine,
        provider: input.authSession.provider
      }
    });

    return this.db.session.create({
      data: {
        userId: riotAccount.userId,
        riotAccountId: riotAccount.id,
        sessionTokenHash: hashSessionToken(input.authSession.sessionId),
        createdAt: new Date(input.authSession.createdAt),
        expiresAt: new Date(input.authSession.expiresAt),
        metadataJson: input.metadataJson ?? {
          provider: input.authSession.provider,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null
        }
      }
    });
  }

  async findActiveSessionByToken(sessionToken: string): Promise<DbSessionRecord | null> {
    const now = new Date();
    return this.db.session.findFirst({
      where: {
        sessionTokenHash: hashSessionToken(sessionToken),
        revokedAt: null,
        expiresAt: {
          gt: now
        }
      },
      include: {
        riotAccount: {
          select: {
            puuid: true,
            gameName: true,
            tagLine: true,
            provider: true
          }
        }
      }
    });
  }

  async revokeSessionByToken(sessionToken: string): Promise<number> {
    const result = await this.db.session.updateMany({
      where: {
        sessionTokenHash: hashSessionToken(sessionToken),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
    return result.count;
  }

  toAuthSessionRecord(session: DbSessionRecord, sessionToken = session.id): AuthSessionRecord | null {
    if (!session.riotAccount) {
      return null;
    }

    return {
      sessionId: sessionToken,
      userId: session.userId,
      puuid: session.riotAccount.puuid,
      gameName: session.riotAccount.gameName,
      tagLine: session.riotAccount.tagLine,
      provider: session.riotAccount.provider === "real" ? "real" : "mock",
      createdAt: session.createdAt.getTime(),
      expiresAt: session.expiresAt.getTime()
    };
  }
}

export const authRepository = new AuthRepository();
