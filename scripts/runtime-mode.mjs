#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ENV_LOCAL_PATH = path.join(process.cwd(), ".env.local");
const ENV_EXAMPLE_PATH = path.join(process.cwd(), ".env.local.example");

const MODE_PROFILES = {
  mock: {
    RIOT_AUTH_PROVIDER: "mock",
    AUTH_SESSION_STORE: "memory",
    RIOT_MATCH_API_PROVIDER: "mock",
    LLM_ANALYSIS_PROVIDER: "mock"
  },
  production: {
    RIOT_AUTH_PROVIDER: "real",
    AUTH_SESSION_STORE: "db",
    RIOT_MATCH_API_PROVIDER: "real",
    LLM_ANALYSIS_PROVIDER: "real"
  }
};

const REQUIRED_PRODUCTION_KEYS = [
  "DATABASE_URL",
  "RIOT_API_KEY",
  "GEMINI_API_KEY",
  "RIOT_RSO_CLIENT_ID",
  "RIOT_RSO_CLIENT_SECRET",
  "RIOT_RSO_REDIRECT_URI"
];

function looksLikePlaceholder(key, value) {
  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  const lower = normalized.toLowerCase();
  if (
    lower.startsWith("your_") ||
    lower.startsWith("change_this") ||
    lower.startsWith("changeme") ||
    lower.startsWith("example")
  ) {
    return true;
  }

  if (key === "DATABASE_URL") {
    return /:\/\/user:password@/i.test(normalized);
  }

  return false;
}

const usage = [
  "사용법:",
  "  node scripts/runtime-mode.mjs mock",
  "  node scripts/runtime-mode.mjs production",
  "  node scripts/runtime-mode.mjs status"
].join("\n");

function parseArgs() {
  const mode = (process.argv[2] ?? "").trim().toLowerCase();
  if (!mode || !["mock", "production", "status"].includes(mode)) {
    console.error(usage);
    process.exit(1);
  }
  return mode;
}

function ensureEnvLocalText() {
  if (existsSync(ENV_LOCAL_PATH)) {
    return readFileSync(ENV_LOCAL_PATH, "utf8");
  }

  if (!existsSync(ENV_EXAMPLE_PATH)) {
    throw new Error(".env.local 또는 .env.local.example 파일을 찾을 수 없습니다.");
  }

  const template = readFileSync(ENV_EXAMPLE_PATH, "utf8");
  writeFileSync(ENV_LOCAL_PATH, template, "utf8");
  console.log("[runtime-mode] .env.local이 없어 .env.local.example로 생성했습니다.");
  return template;
}

function parseEnvLines(text) {
  const lines = text.split(/\r?\n/);
  const keyToIndex = new Map();
  const keyToValue = new Map();

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      return;
    }
    const [, key, value] = match;
    keyToIndex.set(key, index);
    keyToValue.set(key, value);
  });

  return { lines, keyToIndex, keyToValue };
}

function upsertEnv(parsed, key, value) {
  const nextLine = `${key}=${value}`;
  const foundIndex = parsed.keyToIndex.get(key);
  if (foundIndex === undefined) {
    parsed.lines.push(nextLine);
    parsed.keyToIndex.set(key, parsed.lines.length - 1);
  } else {
    parsed.lines[foundIndex] = nextLine;
  }
  parsed.keyToValue.set(key, value);
}

function writeEnv(parsed) {
  const content = `${parsed.lines.join("\n").replace(/\n+$/g, "")}\n`;
  writeFileSync(ENV_LOCAL_PATH, content, "utf8");
}

function printModeStatus(parsed) {
  const authProvider = parsed.keyToValue.get("RIOT_AUTH_PROVIDER") ?? "(unset)";
  const sessionStore = parsed.keyToValue.get("AUTH_SESSION_STORE") ?? "(unset)";
  const matchProvider = parsed.keyToValue.get("RIOT_MATCH_API_PROVIDER") ?? "(unset)";
  const llmProvider = parsed.keyToValue.get("LLM_ANALYSIS_PROVIDER") ?? "(unset)";

  console.log("[runtime-mode] 현재 모드 값");
  console.log(`- RIOT_AUTH_PROVIDER=${authProvider}`);
  console.log(`- AUTH_SESSION_STORE=${sessionStore}`);
  console.log(`- RIOT_MATCH_API_PROVIDER=${matchProvider}`);
  console.log(`- LLM_ANALYSIS_PROVIDER=${llmProvider}`);
}

function printProductionReadiness(parsed) {
  const missing = REQUIRED_PRODUCTION_KEYS.filter((key) => {
    const value = parsed.keyToValue.get(key) ?? "";
    return looksLikePlaceholder(key, value);
  });

  if (!missing.length) {
    console.log("[runtime-mode] production-ready 필수 키 확인 완료");
    return;
  }

  console.log("[runtime-mode] production-ready 전환 전 입력 필요한 키:");
  for (const key of missing) {
    console.log(`- ${key}`);
  }
}

function main() {
  const mode = parseArgs();
  const envText = ensureEnvLocalText();
  const parsed = parseEnvLines(envText);

  if (mode === "status") {
    printModeStatus(parsed);
    return;
  }

  const profile = MODE_PROFILES[mode];
  for (const [key, value] of Object.entries(profile)) {
    upsertEnv(parsed, key, value);
  }

  writeEnv(parsed);
  printModeStatus(parsed);

  if (mode === "production") {
    printProductionReadiness(parsed);
    console.log("[runtime-mode] 참고: 이 모드는 개발환경에서 real/db 설정을 준비하는 용도입니다.");
  }
}

main();
