import { AppError } from "@/src/server/shared";
import type { RiotMatchApiClient, RiotMatchDetailPayload, RiotMatchListItem } from "@/src/server/match-sync/types";

const MOCK_MATCH_LIST_TEMPLATE: RiotMatchListItem[] = [
  {
    matchId: "mock-match-001",
    gameStartAt: "2026-03-17T09:10:00.000Z",
    queueId: "competitive",
    gameMode: "Bomb",
    region: "ap"
  },
  {
    matchId: "mock-match-002",
    gameStartAt: "2026-03-16T16:42:00.000Z",
    queueId: "competitive",
    gameMode: "Bomb",
    region: "ap"
  },
  {
    matchId: "mock-match-003",
    gameStartAt: "2026-03-15T11:25:00.000Z",
    queueId: "unrated",
    gameMode: "Bomb",
    region: "ap"
  }
];

const MOCK_MATCH_DETAILS: Record<string, RiotMatchDetailPayload> = {
  "mock-match-001": {
    matchId: "mock-match-001",
    gameStartAt: "2026-03-17T09:10:00.000Z",
    queueId: "competitive",
    gameMode: "Bomb",
    region: "ap",
    raw: {
      matchInfo: {
        matchId: "mock-match-001",
        queueId: "competitive",
        gameMode: "Bomb",
        gameStartMillis: 1773738600000
      },
      players: [{ puuid: "mock" }],
      roundResults: [{ roundNum: 1 }]
    }
  },
  "mock-match-002": {
    matchId: "mock-match-002",
    gameStartAt: "2026-03-16T16:42:00.000Z",
    queueId: "competitive",
    gameMode: "Bomb",
    region: "ap",
    raw: {
      matchInfo: {
        matchId: "mock-match-002",
        queueId: "competitive",
        gameMode: "Bomb",
        gameStartMillis: 1773679320000
      },
      players: [{ puuid: "mock" }],
      roundResults: [{ roundNum: 1 }]
    }
  },
  "mock-match-003": {
    matchId: "mock-match-003",
    gameStartAt: "2026-03-15T11:25:00.000Z",
    queueId: "unrated",
    gameMode: "Bomb",
    region: "ap",
    raw: {
      matchInfo: {
        matchId: "mock-match-003",
        queueId: "unrated",
        gameMode: "Bomb",
        gameStartMillis: 1773573900000
      },
      players: [{ puuid: "mock" }],
      roundResults: [{ roundNum: 1 }]
    }
  }
};

export class MockRiotMatchApiClient implements RiotMatchApiClient {
  readonly kind = "mock" as const;

  async getMatchListByPuuid(puuid: string): Promise<RiotMatchListItem[]> {
    if (!puuid.trim()) {
      throw new AppError("PUUID가 비어 있어 match list를 조회할 수 없습니다.");
    }

    return MOCK_MATCH_LIST_TEMPLATE.map((item) => ({
      ...item,
      raw: {
        puuid,
        source: "mock-list",
        ...item.raw
      }
    }));
  }

  async getMatchById(matchId: string): Promise<RiotMatchDetailPayload> {
    const payload = MOCK_MATCH_DETAILS[matchId];
    if (!payload) {
      throw new AppError(`Mock match 상세 데이터가 없습니다. (matchId=${matchId})`);
    }

    return {
      ...payload,
      raw: {
        source: "mock-detail",
        ...payload.raw
      }
    };
  }
}
