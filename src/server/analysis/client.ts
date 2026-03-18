import { AppError, getEnv } from "@/src/server/shared";
import { MockGeminiAnalysisClient } from "@/src/server/analysis/mock-client";
import { RealGeminiAnalysisClient } from "@/src/server/analysis/real-client";
import type { AnalysisClient, AnalysisClientKind } from "@/src/server/analysis/types";

const mockClient = new MockGeminiAnalysisClient();
const realClient = new RealGeminiAnalysisClient();

export function getConfiguredAnalysisClientKind(): AnalysisClientKind {
  const raw = getEnv("LLM_ANALYSIS_PROVIDER", "mock").toLowerCase();
  return raw === "real" ? "real" : "mock";
}

export function getAnalysisClient(
  kind: AnalysisClientKind = getConfiguredAnalysisClientKind()
): AnalysisClient {
  if (process.env.NODE_ENV === "production" && kind === "mock") {
    throw new AppError("production 환경에서는 LLM_ANALYSIS_PROVIDER=mock를 사용할 수 없습니다.");
  }
  return kind === "real" ? realClient : mockClient;
}
