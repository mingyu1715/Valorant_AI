import { AppError, getEnv } from "@/src/server/shared";
import type {
  RiotAuthCallbackContext,
  RiotAuthIdentity,
  RiotAuthProvider,
  RiotAuthStartContext
} from "@/src/server/auth/types";

const DEFAULT_RSO_AUTHORIZE_URL = "https://auth.riotgames.com/authorize";
const DEFAULT_RSO_SCOPE = "openid offline_access";

export class RealRiotAuthProvider implements RiotAuthProvider {
  readonly kind = "real" as const;

  async createAuthorizationUrl(input: RiotAuthStartContext): Promise<string> {
    const clientId = getEnv("RIOT_RSO_CLIENT_ID");
    if (!clientId) {
      throw new AppError("RIOT_RSO_CLIENT_ID 환경 변수가 비어 있습니다.");
    }

    const authorizeUrl = new URL(getEnv("RIOT_RSO_AUTHORIZE_URL", DEFAULT_RSO_AUTHORIZE_URL));
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", input.callbackUrl);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", getEnv("RIOT_RSO_SCOPE", DEFAULT_RSO_SCOPE));
    authorizeUrl.searchParams.set("state", input.state);
    return authorizeUrl.toString();
  }

  async resolveIdentityFromCallback(input: RiotAuthCallbackContext): Promise<RiotAuthIdentity> {
    void input;
    // TODO(phase-2): code -> token 교환(RIOT_RSO_CLIENT_SECRET, token endpoint) 후 userinfo/subject에서 puuid를 매핑해야 합니다.
    throw new AppError("Real Riot RSO provider callback 처리는 아직 구현되지 않았습니다.");
  }
}
