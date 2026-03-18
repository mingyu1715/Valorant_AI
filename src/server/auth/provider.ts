import { AppError, getEnv, isMockRestrictedRuntime } from "@/src/server/shared";
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
  if (isMockRestrictedRuntime() && kind === "mock") {
    throw new AppError("production 환경에서는 RIOT_AUTH_PROVIDER=mock를 사용할 수 없습니다.");
  }
  return kind === "real" ? realProvider : mockProvider;
}
