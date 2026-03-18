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
import type { SerializableJsonValue } from "@/src/server/types";

const DEFAULT_MATCH_SYNC_MAX_IDS = 20;

interface SyncTargetAccount {
  userId: string;
  puuid: string;
}

function toPrismaJsonValue(value: unknown): SerializableJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as SerializableJsonValue;
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
    if (puuid) {
      // AUTH_SESSION_STORE=memory 환경에서는 RiotAccount가 없을 수 있으므로 세션 puuid로 fallback 합니다.
      logDev(`[match-sync] RiotAccount 미존재로 session puuid fallback 사용 puuid=${puuid}`);
      return {
        userId: "session",
        puuid
      };
    }
    throw new AppError("동기화 대상 RiotAccount를 찾을 수 없습니다.");
  }

  return {
    userId: account.userId,
    puuid: account.puuid
  };
}

function buildRawMatchPayload(params: {
  puuid: string;
  matchListItem: RiotMatchListItem;
  matchDetail: RiotMatchDetailPayload;
  clientKind: RiotMatchApiClient["kind"];
}): SerializableJsonValue {
  return toPrismaJsonValue({
    schemaVersion: "raw-match-v1",
    source: {
      kind: "riot-match-sync",
      provider: params.clientKind,
      syncedAt: new Date().toISOString()
    },
    identity: {
      puuid: params.puuid,
      matchId: params.matchDetail.matchId
    },
    summary: {
      gameStartAt: params.matchDetail.gameStartAt ?? params.matchListItem.gameStartAt ?? null,
      queueId: params.matchDetail.queueId ?? params.matchListItem.queueId ?? null,
      gameMode: params.matchDetail.gameMode ?? params.matchListItem.gameMode ?? null,
      region: params.matchDetail.region ?? params.matchListItem.region ?? null
    },
    listPayload: params.matchListItem.raw ?? {
      matchId: params.matchListItem.matchId
    },
    matchPayload: params.matchDetail.raw
  });
}

export async function syncRecentMatchesForUser(
  input: SyncRecentMatchesInput,
  client: RiotMatchApiClient = getRiotMatchApiClient()
): Promise<MatchSyncResult> {
  const target = await resolveSyncTarget(input);
  const maxIds = Math.max(1, getIntEnv("RIOT_MATCH_SYNC_MAX_IDS", DEFAULT_MATCH_SYNC_MAX_IDS));

  logDev(`[match-sync] 시작 userId=${target.userId} puuid=${target.puuid} provider=${client.kind}`);

  const matchListItems = await client.getMatchListByPuuid(target.puuid);
  const deduplicatedMatchItems = [...new Map(matchListItems.map((matchItem) => [matchItem.matchId.trim(), matchItem] as const)).values()]
    .filter((matchItem) => matchItem.matchId.trim())
    .slice(0, maxIds);

  const fetchedMatchIds = deduplicatedMatchItems.map((matchItem) => matchItem.matchId.trim());
  const existingMatchIds = await analysisRepository.findExistingMatchIds(fetchedMatchIds);
  const skippedMatchIds = fetchedMatchIds.filter((id) => existingMatchIds.has(id));
  const pendingMatchItems = deduplicatedMatchItems.filter((matchItem) => !existingMatchIds.has(matchItem.matchId.trim()));

  const insertedMatchIds: string[] = [];
  const failedMatches: MatchSyncFailureItem[] = [];

  for (const matchItem of pendingMatchItems) {
    const matchId = matchItem.matchId.trim();

    try {
      const matchDetail = await client.getMatchById(matchId);
      await analysisRepository.upsertRawMatch({
        matchId,
        puuid: target.puuid,
        gameStartAt: toDateOrNull(matchDetail.gameStartAt ?? matchItem.gameStartAt),
        queueId: matchDetail.queueId ?? matchItem.queueId ?? null,
        gameMode: matchDetail.gameMode ?? matchItem.gameMode ?? null,
        region: matchDetail.region ?? matchItem.region ?? null,
        rawJson: buildRawMatchPayload({
          puuid: target.puuid,
          matchListItem: matchItem,
          matchDetail,
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

  const syncResult: MatchSyncResult = {
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

  logDev(`[match-sync] 완료 ${JSON.stringify(sanitizeLogValue(syncResult))}`);
  return syncResult;
}
