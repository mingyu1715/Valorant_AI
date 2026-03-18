import { getEnv } from "@/src/server/shared";
import { MockRiotAuthProvider } from "@/src/server/auth/mock-provider";
import { RealRiotAuthProvider } from "@/src/server/auth/real-provider";
import type { RiotAuthProvider, RiotAuthProviderKind } from "@/src/server/auth/types";

const mockProvider = new MockRiotAuthProvider();
const realProvider = new RealRiotAuthProvider();

export function getConfiguredRiotAuthProviderKind(): RiotAuthProviderKind {
  const raw = getEnv("RIOT_AUTH_PROVIDER", "mock").toLowerCase();
  return raw === "real" ? "real" : "mock";
}

export function getRiotAuthProvider(kind: RiotAuthProviderKind = getConfiguredRiotAuthProviderKind()): RiotAuthProvider {
  return kind === "real" ? realProvider : mockProvider;
}
