import { AppError, getEnv, requireEnv } from "@/src/server/shared";
import type { RiotMatchApiClient, RiotMatchDetailPayload, RiotMatchListItem } from "@/src/server/match-sync/types";

const DEFAULT_MATCH_LIST_BASE_URL = "https://ap.api.riotgames.com";
const DEFAULT_MATCH_DETAIL_BASE_URL = "https://ap.api.riotgames.com";

export class RealRiotMatchApiClient implements RiotMatchApiClient {
  readonly kind = "real" as const;

  async getMatchListByPuuid(puuid: string): Promise<RiotMatchListItem[]> {
    const normalizedPuuid = puuid.trim();
    if (!normalizedPuuid) {
      throw new AppError("PUUID가 비어 있어 match list를 조회할 수 없습니다.");
    }

    const apiKey = requireEnv("RIOT_API_KEY");
    const baseUrl = getEnv("RIOT_MATCH_LIST_BASE_URL", DEFAULT_MATCH_LIST_BASE_URL);
    void apiKey;
    void baseUrl;
    // TODO(phase-4): Riot matchlist endpoint 호출 구현
    throw new AppError("Real Riot Match API client의 match list 조회는 아직 구현되지 않았습니다.");
  }

  async getMatchById(matchId: string): Promise<RiotMatchDetailPayload> {
    const normalizedMatchId = matchId.trim();
    if (!normalizedMatchId) {
      throw new AppError("matchId가 비어 있어 match 상세를 조회할 수 없습니다.");
    }

    const apiKey = requireEnv("RIOT_API_KEY");
    const baseUrl = getEnv("RIOT_MATCH_DETAIL_BASE_URL", DEFAULT_MATCH_DETAIL_BASE_URL);
    void apiKey;
    void baseUrl;
    // TODO(phase-4): Riot match detail endpoint 호출 구현
    throw new AppError("Real Riot Match API client의 match 상세 조회는 아직 구현되지 않았습니다.");
  }
}
