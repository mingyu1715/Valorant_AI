import { buildPlayerAnalysisInput } from "@/src/server/analysis-input/builder";
import type { AnalysisResultBundle } from "@/src/server/analysis/types";
import { generateAnalysisResult } from "@/src/server/analysis/service";
import { analysisRepository } from "@/src/server/db/repositories";
import type { AppLanguage } from "@/src/i18n/config";

export interface GenerateSessionAnalysisInput {
  lang: AppLanguage;
  puuid: string;
  window: string;
  version: string;
  limit: number;
  useCache: boolean;
}

export async function generateSessionAnalysisResult(input: GenerateSessionAnalysisInput): Promise<AnalysisResultBundle> {
  const rawMatches = await analysisRepository.findRawMatchesByPuuid(input.puuid, input.limit);
  const analysisInput = buildPlayerAnalysisInput(input.puuid, rawMatches);
  return generateAnalysisResult({
    lang: input.lang,
    puuid: input.puuid,
    window: input.window,
    version: input.version,
    analysisInput,
    useCache: input.useCache
  });
}
