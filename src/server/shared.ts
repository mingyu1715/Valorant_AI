import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import type { AnalysisSnapshot, LogEntry, SectionConfig } from "@/src/server/types";

export const DEFAULT_RIOT_ID = "";
export const DEFAULT_RIOT_TAG = "";
export const RIOT_ACCOUNT_API_HOST = "asia.api.riotgames.com";
export const RIOT_VAL_MATCH_API_HOST = "ap.api.riotgames.com";
export const DEFAULT_RIOT_MATCH_COUNT = 5;
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_GEMINI_TIMEOUT_SECONDS = 60;
export const MAX_LOG_ENTRIES = 300;
export const MAX_JOB_ENTRIES = 50;
export const ADMIN_SESSION_COOKIE = "valorant_admin_session";
export const DEFAULT_ANALYZE_RATE_LIMIT_MAX = 4;
export const DEFAULT_ANALYZE_RATE_LIMIT_WINDOW_SECONDS = 60;
export const DEFAULT_ADMIN_LOGIN_RATE_LIMIT_MAX = 5;
export const DEFAULT_ADMIN_LOGIN_RATE_LIMIT_WINDOW_SECONDS = 300;

export const DEFAULT_HTTP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*"
} as const;

export const SECTION_CONFIGS: readonly SectionConfig[] = [
  {
    key: "attack_defense",
    title: "공수 진영 분석",
    focus: "공격과 수비에서의 교전 습관, 첫 교전 결과, 라운드 운영 차이만 본다."
  },
  {
    key: "economy",
    title: "자금 및 경제",
    focus: "피스톨, 이코, 하프바이, 풀바이 상황에서의 구매 판단과 성과 차이만 본다."
  },
  {
    key: "clutch",
    title: "클러치 및 멘탈",
    focus: "1:N 마지막 생존 상황에서의 생존율, 라운드 승률, 판단 안정성만 본다."
  },
  {
    key: "utility",
    title: "스킬 효율성",
    focus: "스킬 사용량 대비 어시스트, 능력 마무리 킬, 영향력 있는 유틸 라운드만 본다."
  }
] as const;

const SENSITIVE_LOG_KEYS = new Set([
  "api_key",
  "key",
  "authorization",
  "cookie",
  "set-cookie",
  "x-goog-api-key",
  "riot_api_key",
  "gemini_api_key",
  "admin_access_token",
  "riot_rso_state",
  "riot_rso_client_secret",
  "valorant_auth_session",
  "valorant_riot_auth_flow"
]);

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

interface GlobalStore {
  logs: LogEntry[];
  jobs: Map<string, AnalysisSnapshot>;
  rateLimits: Map<string, RateLimitWindow>;
}

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __valorantCoachStore: GlobalStore | undefined;
}

function getStore(): GlobalStore {
  if (!globalThis.__valorantCoachStore) {
    globalThis.__valorantCoachStore = {
      logs: [],
      jobs: new Map(),
      rateLimits: new Map()
    };
  }
  return globalThis.__valorantCoachStore;
}

export function getJobStore(): Map<string, AnalysisSnapshot> {
  return getStore().jobs;
}

export function generateJobId(): string {
  return randomUUID().replaceAll("-", "");
}

export function getEnv(name: string, defaultValue = ""): string {
  return (process.env[name] ?? defaultValue).trim();
}

export function getClientIp(headers: Headers): string {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor
      .split(",")
      .map((part) => part.trim())
      .find(Boolean) || "unknown";
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (value) {
    return value;
  }
  throw new AppError(`${name} 환경 변수가 비어 있습니다. \`.env.local\`에 값을 설정해 주세요.`);
}

export function getIntEnv(name: string, defaultValue: number): number {
  const rawValue = getEnv(name, String(defaultValue));
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) {
    throw new AppError(`${name} 환경 변수는 숫자여야 합니다.`);
  }
  return parsed;
}

export function isTruthy(value: unknown): boolean {
  return String(value ?? "")
    .trim()
    .toLowerCase() in { "1": true, "true": true, "yes": true, "on": true };
}

export function useSampleAnalytics(): boolean {
  return isTruthy(getEnv("USE_SAMPLE_ANALYTICS", "0"));
}

export function isDebugHttpEnabled(): boolean {
  return isTruthy(getEnv("DEBUG_HTTP", "0"));
}

export function hasAdminAccessConfigured(): boolean {
  return Boolean(getEnv("ADMIN_ACCESS_TOKEN"));
}

function hashAdminToken(value: string): string {
  return createHash("sha256").update(`valorant-admin:${value}`).digest("hex");
}

function safeCompare(left: string, right: string): boolean {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function createAdminSessionValue(token: string): string {
  return hashAdminToken(token.trim());
}

export function isAdminTokenValid(token: string): boolean {
  const configuredToken = getEnv("ADMIN_ACCESS_TOKEN");
  if (!configuredToken) {
    return false;
  }

  return safeCompare(createAdminSessionValue(token), createAdminSessionValue(configuredToken));
}

export function isAdminSessionAuthorized(sessionValue?: string): boolean {
  const configuredToken = getEnv("ADMIN_ACCESS_TOKEN");
  if (!configuredToken || !sessionValue) {
    return false;
  }

  return safeCompare(sessionValue, createAdminSessionValue(configuredToken));
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 8
  };
}

export function safeInt(value: unknown, fallback = 0): number {
  const normalized = Number.parseInt(String(value ?? ""), 10);
  return Number.isNaN(normalized) ? fallback : normalized;
}

export function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatRatio(value: number): string {
  return value.toFixed(2);
}

export function formatKdaTriplet(kills: number, deaths: number, assists: number): string {
  return `${kills}/${deaths}/${assists}`;
}

export function maskSecret(value: string): string {
  if (!value) {
    return value;
  }
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function maskUrl(value: string): string {
  const url = new URL(value);
  for (const [key, currentValue] of url.searchParams.entries()) {
    if (["api_key", "key"].includes(key.toLowerCase())) {
      url.searchParams.set(key, maskSecret(currentValue));
    }
  }
  return url.toString();
}

export function sanitizeLogValue(value: unknown, keyName = ""): unknown {
  const normalizedKey = keyName.trim().toLowerCase();
  if (
    SENSITIVE_LOG_KEYS.has(normalizedKey) ||
    normalizedKey.endsWith("api_key") ||
    normalizedKey.endsWith("_token")
  ) {
    return maskSecret(String(value ?? ""));
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, 20).map((item) => sanitizeLogValue(item, keyName));
    if (value.length > 20) {
      items.push(`... ${value.length - 20}개 항목 생략`);
    }
    return items;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const limitedEntries = entries.slice(0, 40).map(([nestedKey, nestedValue]) => [
      nestedKey,
      sanitizeLogValue(nestedValue, nestedKey)
    ]);
    const sanitized = Object.fromEntries(limitedEntries);
    if (entries.length > 40) {
      sanitized.__truncated__ = `${entries.length - 40}개 항목 생략`;
    }
    return sanitized;
  }

  if (typeof value === "string") {
    if (value.startsWith("RGAPI-") || value.startsWith("AIza")) {
      return maskSecret(value);
    }
    if (value.length > 800) {
      return `${value.slice(0, 800)}... (${value.length - 800}자 생략)`;
    }
    return value;
  }

  return value;
}

function getRateLimitStore(): Map<string, RateLimitWindow> {
  return getStore().rateLimits;
}

function pruneRateLimitStore(now: number): void {
  const store = getRateLimitStore();
  if (store.size < 500) {
    return;
  }

  for (const [key, window] of store.entries()) {
    if (window.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
} {
  const now = Date.now();
  const windowMs = Math.max(windowSeconds, 1) * 1000;
  const normalizedLimit = Math.max(limit, 1);
  const store = getRateLimitStore();
  const current = store.get(key);

  pruneRateLimitStore(now);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remaining: normalizedLimit - 1
    };
  }

  if (current.count >= normalizedLimit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      remaining: 0
    };
  }

  current.count += 1;
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    remaining: normalizedLimit - current.count
  };
}

export function assertValidRiotIdentity(riotId: string, riotTag: string): void {
  const normalizedRiotId = riotId.trim();
  const normalizedRiotTag = riotTag.trim();

  if (!normalizedRiotId || !normalizedRiotTag) {
    throw new AppError("Riot ID와 태그는 비어 있을 수 없습니다.");
  }

  if (normalizedRiotId.length > 32) {
    throw new AppError("Riot ID는 32자를 넘을 수 없습니다.");
  }

  if (normalizedRiotTag.length > 16) {
    throw new AppError("태그는 16자를 넘을 수 없습니다.");
  }

  if (/[\r\n\t]/.test(normalizedRiotId) || /[\r\n\t]/.test(normalizedRiotTag)) {
    throw new AppError("Riot ID와 태그에는 제어 문자를 포함할 수 없습니다.");
  }
}

function appendLog(level: LogEntry["level"], source: string, message: string, context?: unknown): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    level,
    source,
    message,
    context: context === undefined ? null : sanitizeLogValue(context)
  };
  const store = getStore();
  store.logs.push(entry);
  if (store.logs.length > MAX_LOG_ENTRIES) {
    store.logs.splice(0, store.logs.length - MAX_LOG_ENTRIES);
  }
  return entry;
}

function emitConsoleLog(entry: LogEntry): void {
  const prefix = `[${entry.timestamp}]`;
  if (entry.level === "info" && entry.source === "app" && !entry.context) {
    console.log(`${prefix} ${entry.message}`);
    return;
  }

  console.log(`${prefix} [${entry.level.toUpperCase()}] ${entry.source}: ${entry.message}`);
  if (entry.context) {
    console.log(JSON.stringify(entry.context, null, 2));
  }
}

export function logDev(message: string): void {
  emitConsoleLog(appendLog("info", "app", message));
}

export function logError(source: string, message: string, context?: unknown): void {
  emitConsoleLog(appendLog("error", source, message, context));
}

export function getLogSnapshot(limit = 200): LogEntry[] {
  return [...getStore().logs].slice(-limit).reverse();
}

export function trimJobStore(): void {
  const jobs = [...getJobStore().entries()].sort((left, right) => right[1].updatedAt - left[1].updatedAt);
  if (jobs.length <= MAX_JOB_ENTRIES) {
    return;
  }
  const store = getJobStore();
  for (const [jobId] of jobs.slice(MAX_JOB_ENTRIES)) {
    store.delete(jobId);
  }
}

export function maskPuuid(puuid: string): string {
  if (!puuid) {
    return "";
  }
  if (puuid.length <= 12) {
    return puuid;
  }
  return `${puuid.slice(0, 10)}...${puuid.slice(-6)}`;
}

export function extractErrorMessage(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== "object") {
    return "응답 본문을 해석할 수 없습니다.";
  }

  const body = responseBody as Record<string, unknown>;
  const status = body.status;
  if (status && typeof status === "object" && typeof (status as Record<string, unknown>).message === "string") {
    return String((status as Record<string, unknown>).message);
  }

  const error = body.error;
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") {
    return String((error as Record<string, unknown>).message);
  }

  if (typeof body.message === "string") {
    return body.message;
  }

  return JSON.stringify(body);
}

function maskDebugHeaders(headers: Record<string, string>): Record<string, string> {
  const nextHeaders = { ...headers };
  if (nextHeaders["x-goog-api-key"]) {
    nextHeaders["x-goog-api-key"] = maskSecret(nextHeaders["x-goog-api-key"]);
  }
  return nextHeaders;
}

function decodeJsonText(rawBody: string): unknown {
  if (!rawBody) {
    return {};
  }
  return JSON.parse(rawBody);
}

interface RequestJsonOptions {
  method?: string;
  headers?: Record<string, string>;
  payload?: unknown;
  timeoutSeconds?: number;
}

export async function requestJson<T = unknown>(
  url: string,
  options: RequestJsonOptions = {}
): Promise<{ statusCode: number; body: T }> {
  const method = options.method ?? "GET";
  const timeoutSeconds = options.timeoutSeconds ?? 15;
  const requestHeaders = {
    ...DEFAULT_HTTP_HEADERS,
    ...(options.headers ?? {})
  } as Record<string, string>;

  let requestBody: string | undefined;
  if (options.payload !== undefined) {
    requestHeaders["Content-Type"] = "application/json; charset=utf-8";
    requestBody = JSON.stringify(options.payload);
  }

  const requestContext = {
    method,
    url: maskUrl(url),
    headers: sanitizeLogValue(maskDebugHeaders(requestHeaders)),
    payload: options.payload === undefined ? null : sanitizeLogValue(options.payload),
    timeoutSeconds
  };

  if (isDebugHttpEnabled()) {
    logDev(`HTTP 요청: ${method} ${maskUrl(url)}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      cache: "no-store",
      signal: controller.signal
    });
    const rawBody = await response.text();
    const parsedBody = (rawBody ? decodeJsonText(rawBody) : {}) as T;

    if (!response.ok) {
      logError("http", `외부 API 요청이 ${response.status} 오류로 실패했습니다.`, {
        ...requestContext,
        statusCode: response.status,
        responseBody: sanitizeLogValue(rawBody)
      });
    }

    return {
      statusCode: response.status,
      body: parsedBody
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logError("http", "외부 API 요청이 타임아웃으로 실패했습니다.", {
        ...requestContext,
        error: error.message
      });
      throw new AppError(`API 응답 대기 시간이 초과되었습니다. (timeout=${timeoutSeconds}초)`);
    }

    const message = error instanceof Error ? error.message : String(error);
    logError("http", "외부 API 요청 중 네트워크 오류가 발생했습니다.", {
      ...requestContext,
      error: message
    });
    throw new AppError(`네트워크 요청에 실패했습니다: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
