import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/src/server/db/client";

type JsonInput = Prisma.InputJsonValue;

type DbClientLike = {
  rawMatch: {
    upsert: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
  };
  playerFeatureSnapshot: {
    findFirst: (args: unknown) => Promise<unknown | null>;
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
  };
  analysisCache: {
    findFirst: (args: unknown) => Promise<unknown | null>;
    upsert: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
};

export interface UpsertRawMatchInput {
  matchId: string;
  puuid: string;
  rawJson: JsonInput;
  gameStartAt?: Date | null;
  queueId?: string | null;
  gameMode?: string | null;
  region?: string | null;
}

export interface UpsertFeatureSnapshotInput {
  puuid: string;
  window: string;
  version: string;
  featureJson: JsonInput;
  sourceMatchIdsJson?: JsonInput | null;
  metadataJson?: JsonInput | null;
}

export interface RawMatchRecordForFeatureExtraction {
  matchId: string;
  puuid: string;
  gameStartAt: Date | null;
  rawJson: unknown;
}

export interface UpsertAnalysisCacheInput {
  cacheKey: string;
  inputJson: JsonInput;
  outputJson: JsonInput;
  puuid?: string | null;
  window?: string | null;
  version?: string | null;
  model?: string | null;
  promptHash?: string | null;
  metadataJson?: JsonInput | null;
  expiresAt?: Date | null;
}

export class AnalysisRepository {
  private readonly db: DbClientLike;

  constructor(client: PrismaClient = prisma) {
    this.db = client as unknown as DbClientLike;
  }

  async upsertRawMatch(input: UpsertRawMatchInput): Promise<unknown> {
    return this.db.rawMatch.upsert({
      where: {
        matchId: input.matchId
      },
      create: {
        matchId: input.matchId,
        puuid: input.puuid,
        rawJson: input.rawJson,
        gameStartAt: input.gameStartAt ?? null,
        queueId: input.queueId ?? null,
        gameMode: input.gameMode ?? null,
        region: input.region ?? null
      },
      update: {
        puuid: input.puuid,
        rawJson: input.rawJson,
        gameStartAt: input.gameStartAt ?? undefined,
        queueId: input.queueId ?? undefined,
        gameMode: input.gameMode ?? undefined,
        region: input.region ?? undefined
      }
    });
  }

  async findExistingMatchIds(matchIds: string[]): Promise<Set<string>> {
    const normalizedIds = [...new Set(matchIds.map((item) => item.trim()).filter(Boolean))];
    if (!normalizedIds.length) {
      return new Set<string>();
    }

    const rows = await this.db.rawMatch.findMany({
      where: {
        matchId: {
          in: normalizedIds
        }
      },
      select: {
        matchId: true
      }
    });

    return new Set(
      rows
        .map((row) => String(row.matchId ?? "").trim())
        .filter(Boolean)
    );
  }

  async findRawMatchesByPuuid(puuid: string, limit = 20): Promise<RawMatchRecordForFeatureExtraction[]> {
    const normalizedPuuid = puuid.trim();
    if (!normalizedPuuid) {
      return [];
    }

    const rows = await this.db.rawMatch.findMany({
      where: {
        puuid: normalizedPuuid
      },
      orderBy: {
        gameStartAt: "desc"
      },
      take: Math.max(1, Math.min(limit, 100)),
      select: {
        matchId: true,
        puuid: true,
        gameStartAt: true,
        rawJson: true
      }
    });

    return rows.map((row) => ({
      matchId: String(row.matchId ?? ""),
      puuid: String(row.puuid ?? normalizedPuuid),
      gameStartAt: row.gameStartAt instanceof Date ? row.gameStartAt : null,
      rawJson: row.rawJson ?? null
    }));
  }

  async upsertFeatureSnapshot(input: UpsertFeatureSnapshotInput): Promise<unknown> {
    const existing = await this.db.playerFeatureSnapshot.findFirst({
      where: {
        puuid: input.puuid,
        window: input.window,
        version: input.version
      },
      select: {
        id: true
      }
    });

    if (!existing || typeof existing !== "object" || !("id" in existing)) {
      return this.db.playerFeatureSnapshot.create({
        data: {
          puuid: input.puuid,
          window: input.window,
          version: input.version,
          featureJson: input.featureJson,
          sourceMatchIdsJson: input.sourceMatchIdsJson ?? null,
          metadataJson: input.metadataJson ?? null,
          generatedAt: new Date()
        }
      });
    }

    return this.db.playerFeatureSnapshot.update({
      where: {
        id: (existing as { id: string }).id
      },
      data: {
        featureJson: input.featureJson,
        sourceMatchIdsJson: input.sourceMatchIdsJson ?? undefined,
        metadataJson: input.metadataJson ?? undefined,
        generatedAt: new Date()
      }
    });
  }

  async getValidAnalysisCache(cacheKey: string, now = new Date()): Promise<unknown | null> {
    return this.db.analysisCache.findFirst({
      where: {
        cacheKey,
        OR: [
          { expiresAt: null },
          {
            expiresAt: {
              gt: now
            }
          }
        ]
      }
    });
  }

  async upsertAnalysisCache(input: UpsertAnalysisCacheInput): Promise<unknown> {
    return this.db.analysisCache.upsert({
      where: {
        cacheKey: input.cacheKey
      },
      create: {
        cacheKey: input.cacheKey,
        puuid: input.puuid ?? null,
        window: input.window ?? null,
        version: input.version ?? null,
        model: input.model ?? null,
        promptHash: input.promptHash ?? null,
        inputJson: input.inputJson,
        outputJson: input.outputJson,
        metadataJson: input.metadataJson ?? null,
        expiresAt: input.expiresAt ?? null,
        hitCount: 0,
        lastAccessAt: null
      },
      update: {
        puuid: input.puuid ?? undefined,
        window: input.window ?? undefined,
        version: input.version ?? undefined,
        model: input.model ?? undefined,
        promptHash: input.promptHash ?? undefined,
        inputJson: input.inputJson,
        outputJson: input.outputJson,
        metadataJson: input.metadataJson ?? undefined,
        expiresAt: input.expiresAt ?? undefined
      }
    });
  }

  async markAnalysisCacheHit(cacheKey: string): Promise<number> {
    const result = await this.db.analysisCache.updateMany({
      where: { cacheKey },
      data: {
        hitCount: {
          increment: 1
        },
        lastAccessAt: new Date()
      }
    });
    return result.count;
  }
}

export const analysisRepository = new AnalysisRepository();
