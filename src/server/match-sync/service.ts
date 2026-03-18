import type { Prisma } from "@prisma/client";

import { analysisRepository, authRepository } from "@/src/server/db/repositories";
import {
  AppError,
  getIntEnv,
  logDev,
  logError,
  sanitizeLogValue
} from "@/src/server/shared";
import { getRiotMatchApiClient } from "@/src/server/match-sync/client";
import type {
  MatchSyncFailureItem,
  MatchSyncResult,
  RiotMatchApiClient,
  RiotMatchDetailPayload,
  RiotMatchListItem,
  SyncRecentMatchesInput
} from "@/src/server/match-sync/types";

const DEFAULT_MATCH_SYNC_MAX_IDS = 20;

interface SyncTargetAccount {
  userId: string;
  puuid: string;
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toDateOrNull(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const numericDate = new Date(value);
    return Number.isNaN(numericDate.getTime()) ? null : numericDate;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function resolveSyncTarget(input: SyncRecentMatchesInput): Promise<SyncTargetAccount> {
  const puuid = input.puuid?.trim();
  const userId = input.userId?.trim();

  if (!puuid && !userId) {
    throw new AppError("match sync 대상 식별자(userId 또는 puuid)가 필요합니다.");
  }

  const account = puuid
    ? await authRepository.findRiotAccountByPuuid(puuid)
    : await authRepository.findRiotAccountByUserId(userId || "");

  if (!account) {
    throw new AppError("동기화 대상 RiotAccount를 찾을 수 없습니다.");
  }

  return {
    userId: account.userId,
    puuid: account.puuid
  };
}

function buildRawMatchPayload(params: {
  puuid: string;
  listItem: RiotMatchListItem;
  detail: RiotMatchDetailPayload;
  clientKind: RiotMatchApiClient["kind"];
}): Prisma.InputJsonValue {
  return toPrismaJsonValue({
    schemaVersion: "raw-match-v1",
    source: {
      kind: "riot-match-sync",
      provider: params.clientKind,
      syncedAt: new Date().toISOString()
    },
    identity: {
      puuid: params.puuid,
      matchId: params.detail.matchId
    },
    summary: {
      gameStartAt: params.detail.gameStartAt ?? params.listItem.gameStartAt ?? null,
      queueId: params.detail.queueId ?? params.listItem.queueId ?? null,
      gameMode: params.detail.gameMode ?? params.listItem.gameMode ?? null,
      region: params.detail.region ?? params.listItem.region ?? null
    },
    listPayload: params.listItem.raw ?? {
      matchId: params.listItem.matchId
    },
    matchPayload: params.detail.raw
  });
}

export async function syncRecentMatchesForUser(
  input: SyncRecentMatchesInput,
  client: RiotMatchApiClient = getRiotMatchApiClient()
): Promise<MatchSyncResult> {
  const target = await resolveSyncTarget(input);
  const maxIds = Math.max(1, getIntEnv("RIOT_MATCH_SYNC_MAX_IDS", DEFAULT_MATCH_SYNC_MAX_IDS));

  logDev(`[match-sync] 시작 userId=${target.userId} puuid=${target.puuid} provider=${client.kind}`);

  const list = await client.getMatchListByPuuid(target.puuid);
  const uniqueList = [...new Map(list.map((item) => [item.matchId.trim(), item] as const)).values()]
    .filter((item) => item.matchId.trim())
    .slice(0, maxIds);

  const fetchedMatchIds = uniqueList.map((item) => item.matchId.trim());
  const existingMatchIds = await analysisRepository.findExistingMatchIds(fetchedMatchIds);
  const skippedMatchIds = fetchedMatchIds.filter((id) => existingMatchIds.has(id));
  const pendingItems = uniqueList.filter((item) => !existingMatchIds.has(item.matchId.trim()));

  const insertedMatchIds: string[] = [];
  const failedMatches: MatchSyncFailureItem[] = [];

  for (const item of pendingItems) {
    const matchId = item.matchId.trim();

    try {
      const detail = await client.getMatchById(matchId);
      await analysisRepository.upsertRawMatch({
        matchId,
        puuid: target.puuid,
        gameStartAt: toDateOrNull(detail.gameStartAt ?? item.gameStartAt),
        queueId: detail.queueId ?? item.queueId ?? null,
        gameMode: detail.gameMode ?? item.gameMode ?? null,
        region: detail.region ?? item.region ?? null,
        rawJson: buildRawMatchPayload({
          puuid: target.puuid,
          listItem: item,
          detail,
          clientKind: client.kind
        })
      });

      insertedMatchIds.push(matchId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failedMatches.push({ matchId, reason });
      logError("match-sync", "match 상세 조회 또는 저장에 실패했습니다.", {
        userId: target.userId,
        puuid: target.puuid,
        matchId,
        reason,
        provider: client.kind
      });
    }
  }

  const result: MatchSyncResult = {
    userId: target.userId,
    puuid: target.puuid,
    provider: client.kind,
    fetchedMatchIdsCount: fetchedMatchIds.length,
    insertedCount: insertedMatchIds.length,
    skippedCount: skippedMatchIds.length,
    failedCount: failedMatches.length,
    fetchedMatchIds,
    insertedMatchIds,
    skippedMatchIds,
    failedMatches
  };

  logDev(`[match-sync] 완료 ${JSON.stringify(sanitizeLogValue(result))}`);
  return result;
}
