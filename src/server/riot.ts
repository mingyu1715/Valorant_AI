import type { AccountInfo, RiotMatchPayload } from "@/src/server/types";
import {
  AppError,
  DEFAULT_RIOT_ID,
  DEFAULT_RIOT_TAG,
  RIOT_ACCOUNT_API_HOST,
  RIOT_VAL_MATCH_API_HOST,
  extractErrorMessage,
  logDev,
  maskPuuid,
  maskUrl,
  requestJson,
  requireEnv
} from "@/src/server/shared";

export function buildAccountUrl(riotId: string, riotTag: string, riotApiKey: string): string {
  const encodedRiotId = encodeURIComponent(riotId);
  const encodedRiotTag = encodeURIComponent(riotTag);
  const query = new URLSearchParams({ api_key: riotApiKey });
  return `https://${RIOT_ACCOUNT_API_HOST}/riot/account/v1/accounts/by-riot-id/${encodedRiotId}/${encodedRiotTag}?${query.toString()}`;
}

export function buildMatchlistUrl(puuid: string, riotApiKey: string, size: number): string {
  const encodedPuuid = encodeURIComponent(puuid);
  const query = new URLSearchParams({
    size: String(size),
    api_key: riotApiKey
  });
  return `https://${RIOT_VAL_MATCH_API_HOST}/val/match/v1/matchlists/by-puuid/${encodedPuuid}?${query.toString()}`;
}

export function buildMatchUrl(matchId: string, riotApiKey: string): string {
  const encodedMatchId = encodeURIComponent(matchId);
  const query = new URLSearchParams({ api_key: riotApiKey });
  return `https://${RIOT_VAL_MATCH_API_HOST}/val/match/v1/matches/${encodedMatchId}?${query.toString()}`;
}

export function buildPlayerPayload(accountInfo: AccountInfo) {
  return {
    riotId: accountInfo.gameName || DEFAULT_RIOT_ID,
    riotTag: accountInfo.tagLine || DEFAULT_RIOT_TAG,
    puuidMasked: maskPuuid(accountInfo.puuid ?? "")
  };
}

async function fetchRiotPayload<T>(url: string, context: string): Promise<T> {
  logDev(`${context}: ${maskUrl(url)}`);
  const { statusCode, body } = await requestJson<T>(url);
  if (statusCode === 200) {
    return body;
  }

  const message = extractErrorMessage(body);
  if (statusCode === 403) {
    throw new AppError(
      `${context}이(가) 403으로 거부되었습니다. 현재 Riot API 키로는 VAL Match 데이터에 접근할 수 없을 수 있습니다. (${message})`
    );
  }
  throw new AppError(`${context} 실패: ${statusCode} (${message})`);
}

export async function getAccountInfo(riotId?: string, riotTag?: string): Promise<AccountInfo> {
  const riotApiKey = requireEnv("RIOT_API_KEY");
  const effectiveRiotId = (riotId || DEFAULT_RIOT_ID).trim();
  const effectiveRiotTag = (riotTag || DEFAULT_RIOT_TAG).trim();

  if (!effectiveRiotId || !effectiveRiotTag) {
    throw new AppError("Riot ID와 태그는 비어 있을 수 없습니다.");
  }

  const accountUrl = buildAccountUrl(effectiveRiotId, effectiveRiotTag, riotApiKey);
  const responseBody = await fetchRiotPayload<Record<string, unknown>>(accountUrl, "Riot account 조회");
  const puuid = String(responseBody.puuid ?? "");
  if (!puuid) {
    throw new AppError("라이엇 API 응답에 PUUID가 없습니다.");
  }

  return {
    puuid,
    gameName: String(responseBody.gameName ?? effectiveRiotId),
    tagLine: String(responseBody.tagLine ?? effectiveRiotTag),
    requestUrl: accountUrl
  };
}

async function fetchMatchlist(puuid: string, matchCount: number): Promise<Array<Record<string, unknown>>> {
  const riotApiKey = requireEnv("RIOT_API_KEY");
  const lookupSize = Math.min(Math.max(matchCount * 2, matchCount), 15);
  const matchlistUrl = buildMatchlistUrl(puuid, riotApiKey, lookupSize);
  const responseBody = await fetchRiotPayload<{ history?: Array<Record<string, unknown>> }>(
    matchlistUrl,
    "Riot matchlist 조회"
  );
  return responseBody.history ?? [];
}

async function fetchMatch(matchId: string): Promise<RiotMatchPayload> {
  const riotApiKey = requireEnv("RIOT_API_KEY");
  const matchUrl = buildMatchUrl(matchId, riotApiKey);
  return fetchRiotPayload<RiotMatchPayload>(matchUrl, `Riot match 조회 (${matchId})`);
}

export async function fetchRecentMatchesForPlayer(puuid: string, matchCount: number): Promise<RiotMatchPayload[]> {
  const matchEntries = await fetchMatchlist(puuid, matchCount);
  if (!matchEntries.length) {
    throw new AppError("최근 매치 목록이 비어 있습니다.");
  }

  const rankedMatches: RiotMatchPayload[] = [];
  const fallbackMatches: RiotMatchPayload[] = [];

  for (const entry of matchEntries) {
    const matchId = String(entry.matchId ?? "");
    if (!matchId) {
      continue;
    }

    const matchPayload = await fetchMatch(matchId);
    const matchInfo = matchPayload.matchInfo ?? {};
    if (matchInfo.isCompleted === false) {
      continue;
    }

    fallbackMatches.push(matchPayload);
    if (matchInfo.isRanked) {
      rankedMatches.push(matchPayload);
      if (rankedMatches.length >= matchCount) {
        break;
      }
    }
  }

  if (rankedMatches.length >= matchCount) {
    return rankedMatches.slice(0, matchCount);
  }
  if (fallbackMatches.length) {
    return fallbackMatches.slice(0, matchCount);
  }

  throw new AppError("분석 가능한 최근 매치를 찾지 못했습니다.");
}
