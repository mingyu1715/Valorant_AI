import { getEnv } from "@/src/server/shared";
import { MockRiotMatchApiClient } from "@/src/server/match-sync/mock-client";
import { RealRiotMatchApiClient } from "@/src/server/match-sync/real-client";
import type { RiotMatchApiClient, RiotMatchApiClientKind } from "@/src/server/match-sync/types";

const mockClient = new MockRiotMatchApiClient();
const realClient = new RealRiotMatchApiClient();

export function getConfiguredRiotMatchApiClientKind(): RiotMatchApiClientKind {
  const raw = getEnv("RIOT_MATCH_API_PROVIDER", "mock").toLowerCase();
  return raw === "real" ? "real" : "mock";
}

export function getRiotMatchApiClient(
  kind: RiotMatchApiClientKind = getConfiguredRiotMatchApiClientKind()
): RiotMatchApiClient {
  return kind === "real" ? realClient : mockClient;
}
