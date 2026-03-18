import { AppError, getEnv } from "@/src/server/shared";
import { MockRiotMatchApiClient } from "@/src/server/match-sync/mock-client";
import { RealRiotMatchApiClient } from "@/src/server/match-sync/real-client";
import type { RiotMatchApiClient, RiotMatchApiClientKind } from "@/src/server/match-sync/types";

const mockClient = new MockRiotMatchApiClient();
const realClient = new RealRiotMatchApiClient();

function hasConfiguredRiotApiKey(): boolean {
  return /^RGAPI-/i.test(getEnv("RIOT_API_KEY"));
}

export function getConfiguredRiotMatchApiClientKind(): RiotMatchApiClientKind {
  const raw = getEnv("RIOT_MATCH_API_PROVIDER", "").toLowerCase();
  if (raw === "real") {
    return "real";
  }
  if (raw === "mock") {
    return "mock";
  }
  return hasConfiguredRiotApiKey() ? "real" : "mock";
}

export function getRiotMatchApiClient(
  kind: RiotMatchApiClientKind = getConfiguredRiotMatchApiClientKind()
): RiotMatchApiClient {
  if (process.env.NODE_ENV === "production" && kind === "mock") {
    throw new AppError("production 환경에서는 RIOT_MATCH_API_PROVIDER=mock를 사용할 수 없습니다.");
  }
  return kind === "real" ? realClient : mockClient;
}
