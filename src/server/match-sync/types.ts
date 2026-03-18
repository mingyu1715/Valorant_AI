export type RiotMatchApiClientKind = "mock" | "real";

export interface RiotMatchListItem {
  matchId: string;
  gameStartAt?: string | number | null;
  queueId?: string | null;
  gameMode?: string | null;
  region?: string | null;
  raw?: Record<string, unknown>;
}

export interface RiotMatchDetailPayload {
  matchId: string;
  gameStartAt?: string | number | null;
  queueId?: string | null;
  gameMode?: string | null;
  region?: string | null;
  raw: Record<string, unknown>;
}

export interface RiotMatchApiClient {
  readonly kind: RiotMatchApiClientKind;
  getMatchListByPuuid(puuid: string): Promise<RiotMatchListItem[]>;
  getMatchById(matchId: string): Promise<RiotMatchDetailPayload>;
}

export interface SyncRecentMatchesInput {
  userId?: string;
  puuid?: string;
}

export interface MatchSyncFailureItem {
  matchId: string;
  reason: string;
}

export interface MatchSyncResult {
  userId: string;
  puuid: string;
  provider: RiotMatchApiClientKind;
  fetchedMatchIdsCount: number;
  insertedCount: number;
  skippedCount: number;
  failedCount: number;
  fetchedMatchIds: string[];
  insertedMatchIds: string[];
  skippedMatchIds: string[];
  failedMatches: MatchSyncFailureItem[];
}
