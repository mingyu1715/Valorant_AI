import { createHash } from "node:crypto";

import { AppError, getEnv } from "@/src/server/shared";
import type {
  RiotAuthCallbackContext,
  RiotAuthIdentity,
  RiotAuthProvider,
  RiotAuthStartContext
} from "@/src/server/auth/types";

const MOCK_CODE_PREFIX = "mock_code_";
const DEFAULT_MOCK_GAME_NAME = "MockPlayer";
const DEFAULT_MOCK_TAG_LINE = "KR1";

function buildMockPuuid(seed: string): string {
  return createHash("sha256").update(`valorant-mock-rso:${seed}`).digest("hex");
}

export class MockRiotAuthProvider implements RiotAuthProvider {
  readonly kind = "mock" as const;

  async createAuthorizationUrl(input: RiotAuthStartContext): Promise<string> {
    const callbackUrl = new URL(input.callbackUrl);
    callbackUrl.searchParams.set("code", `${MOCK_CODE_PREFIX}${input.state.replaceAll("-", "")}`);
    callbackUrl.searchParams.set("state", input.state);
    callbackUrl.searchParams.set("provider", this.kind);
    return callbackUrl.toString();
  }

  async resolveIdentityFromCallback(input: RiotAuthCallbackContext): Promise<RiotAuthIdentity> {
    if (!input.code.startsWith(MOCK_CODE_PREFIX)) {
      throw new AppError("Mock RSO 코드 형식이 올바르지 않습니다.");
    }

    const gameName = getEnv("MOCK_RIOT_GAME_NAME", DEFAULT_MOCK_GAME_NAME);
    const tagLine = getEnv("MOCK_RIOT_TAG_LINE", DEFAULT_MOCK_TAG_LINE);
    const puuid = buildMockPuuid(`${input.state}:${input.code}:${gameName}:${tagLine}`);

    return {
      puuid,
      gameName,
      tagLine,
      provider: this.kind
    };
  }
}
