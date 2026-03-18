import {
  AppError,
  extractErrorMessage,
  getEnv,
  getIntEnv,
  logDev,
  maskUrl,
  requestJson,
  requireEnv
} from "@/src/server/shared";
import type { RiotMatchApiClient, RiotMatchDetailPayload, RiotMatchListItem } from "@/src/server/match-sync/types";

const DEFAULT_MATCH_LIST_BASE_URL = "https://ap.api.riotgames.com";
const DEFAULT_MATCH_DETAIL_BASE_URL = "https://ap.api.riotgames.com";
const DEFAULT_MATCH_LIST_SIZE = 20;
const MAX_MATCH_LIST_SIZE = 50;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, "");
}

function buildApiUrl(baseUrl: string, path: string, params: Record<string, string>): string {
  const url = new URL(`${trimTrailingSlash(baseUrl)}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => item as Record<string, unknown>);
}

function toStringOrNull(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function toMatchIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function toNumberOrStringOrNull(value: unknown): number | string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function buildRiotError(context: string, statusCode: number, responseBody: unknown): AppError {
  const message = extractErrorMessage(responseBody);
  if (statusCode === 403) {
    return new AppError(
      `${context}이(가) 403으로 거부되었습니다. Riot API 키 권한/만료 상태를 확인해 주세요. (${message})`
    );
  }
  if (statusCode === 404) {
    return new AppError(`${context} 대상을 찾지 못했습니다. (${message})`);
  }
  if (statusCode === 429) {
    return new AppError(`${context} 요청 제한에 도달했습니다. 잠시 후 다시 시도해 주세요. (${message})`);
  }
  return new AppError(`${context} 실패: ${statusCode} (${message})`);
}

function parseMatchListItems(responseBody: unknown): RiotMatchListItem[] {
  const body = toRecord(responseBody);
  const historyItems = toRecordArray(body.history);
  if (historyItems.length > 0) {
    const listItems: RiotMatchListItem[] = [];
    for (const historyItem of historyItems) {
      const matchId = String(historyItem.matchId ?? "").trim();
      if (!matchId) {
        continue;
      }
      listItems.push({
        matchId,
        gameStartAt: toNumberOrStringOrNull(
          historyItem.gameStartTimeMillis ?? historyItem.gameStartMillis ?? historyItem.gameStartAt
        ),
        queueId: toStringOrNull(historyItem.queueId),
        gameMode: toStringOrNull(historyItem.gameMode),
        region: toStringOrNull(historyItem.region),
        raw: historyItem
      });
    }
    return listItems;
  }

  const directMatchIds = toMatchIdArray(body.matches);
  if (directMatchIds.length > 0) {
    return directMatchIds.map((matchId) => ({
      matchId,
      raw: { matchId }
    }));
  }

  return [];
}

async function fetchRiotJson<T>(input: {
  url: string;
  apiKey: string;
  context: string;
}): Promise<T> {
  logDev(`[riot-match-sync] ${input.context}: ${maskUrl(input.url)}`);
  const { statusCode, body } = await requestJson<T>(input.url, {
    headers: {
      "X-Riot-Token": input.apiKey
    }
  });

  if (statusCode >= 200 && statusCode < 300) {
    return body;
  }

  throw buildRiotError(input.context, statusCode, body);
}

export class RealRiotMatchApiClient implements RiotMatchApiClient {
  readonly kind = "real" as const;

  async getMatchListByPuuid(puuid: string): Promise<RiotMatchListItem[]> {
    const normalizedPuuid = puuid.trim();
    if (!normalizedPuuid) {
      throw new AppError("PUUID가 비어 있어 match list를 조회할 수 없습니다.");
    }

    const apiKey = requireEnv("RIOT_API_KEY");
    const baseUrl = getEnv("RIOT_MATCH_LIST_BASE_URL", DEFAULT_MATCH_LIST_BASE_URL);
    const configuredSize = getIntEnv("RIOT_MATCH_SYNC_MAX_IDS", DEFAULT_MATCH_LIST_SIZE);
    const size = Math.min(Math.max(1, configuredSize), MAX_MATCH_LIST_SIZE);
    const url = buildApiUrl(baseUrl, `/val/match/v1/matchlists/by-puuid/${encodeURIComponent(normalizedPuuid)}`, {
      size: String(size)
    });
    const responseBody = await fetchRiotJson<Record<string, unknown>>({
      url,
      apiKey,
      context: "Riot match list 조회"
    });
    return parseMatchListItems(responseBody);
  }

  async getMatchById(matchId: string): Promise<RiotMatchDetailPayload> {
    const normalizedMatchId = matchId.trim();
    if (!normalizedMatchId) {
      throw new AppError("matchId가 비어 있어 match 상세를 조회할 수 없습니다.");
    }

    const apiKey = requireEnv("RIOT_API_KEY");
    const baseUrl = getEnv("RIOT_MATCH_DETAIL_BASE_URL", DEFAULT_MATCH_DETAIL_BASE_URL);
    const url = buildApiUrl(baseUrl, `/val/match/v1/matches/${encodeURIComponent(normalizedMatchId)}`, {});
    const responseBody = await fetchRiotJson<Record<string, unknown>>({
      url,
      apiKey,
      context: `Riot match 조회 (${normalizedMatchId})`
    });

    const matchInfo = toRecord(responseBody.matchInfo);
    const resolvedMatchId = String(matchInfo.matchId ?? normalizedMatchId).trim() || normalizedMatchId;

    return {
      matchId: resolvedMatchId,
      gameStartAt: toNumberOrStringOrNull(matchInfo.gameStartMillis ?? matchInfo.gameStartTimeMillis),
      queueId: toStringOrNull(matchInfo.queueId),
      gameMode: toStringOrNull(matchInfo.gameMode),
      region: toStringOrNull(matchInfo.region),
      raw: responseBody
    };
  }
}
