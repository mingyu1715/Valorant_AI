export type RiotAuthProviderKind = "mock" | "real";

export interface RiotAuthIdentity {
  puuid: string;
  gameName: string;
  tagLine: string;
  provider: RiotAuthProviderKind;
}

export interface RiotAuthStartContext {
  state: string;
  callbackUrl: string;
  requestUrl: string;
}

export interface RiotAuthCallbackContext {
  code: string;
  state: string;
  callbackUrl: string;
  requestUrl: string;
}

export interface RiotAuthProvider {
  readonly kind: RiotAuthProviderKind;
  createAuthorizationUrl(input: RiotAuthStartContext): Promise<string>;
  resolveIdentityFromCallback(input: RiotAuthCallbackContext): Promise<RiotAuthIdentity>;
}

export interface AuthSessionRecord {
  sessionId: string;
  userId?: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  provider: RiotAuthProviderKind;
  createdAt: number;
  expiresAt: number;
}

export interface AuthSessionStore {
  create(record: AuthSessionRecord): Promise<void>;
  getById(sessionId: string): Promise<AuthSessionRecord | null>;
  deleteById(sessionId: string): Promise<void>;
}
