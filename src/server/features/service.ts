import { analysisRepository } from "@/src/server/db/repositories";
import {
  DEFAULT_FEATURE_VERSION,
  DEFAULT_FEATURE_WINDOW,
  buildFeatureSnapshotInput,
  extractFeaturesForPlayer
} from "@/src/server/features/extractor";
import type { FeatureExtractionResult, RawMatchFeatureInput } from "@/src/server/features/types";
import { AppError, logDev } from "@/src/server/shared";

interface ExtractAndSaveOptions {
  window?: string;
  version?: string;
}

interface ExtractFromDbOptions extends ExtractAndSaveOptions {
  limit?: number;
}

export function extractFeaturesFromRawMatches(
  puuid: string,
  rawMatches: RawMatchFeatureInput[],
  version = DEFAULT_FEATURE_VERSION
): FeatureExtractionResult {
  if (!puuid.trim()) {
    throw new AppError("feature extraction을 위해 puuid가 필요합니다.");
  }

  return extractFeaturesForPlayer(puuid, rawMatches, version);
}

export async function extractAndSaveFeaturesFromRawMatches(
  puuid: string,
  rawMatches: RawMatchFeatureInput[],
  options: ExtractAndSaveOptions = {}
): Promise<FeatureExtractionResult> {
  const version = options.version ?? DEFAULT_FEATURE_VERSION;
  const window = options.window ?? DEFAULT_FEATURE_WINDOW;
  const extraction = extractFeaturesFromRawMatches(puuid, rawMatches, version);

  await analysisRepository.upsertFeatureSnapshot(
    buildFeatureSnapshotInput(extraction, {
      window,
      version
    })
  );

  logDev(`[feature] snapshot 저장 puuid=${puuid} matchCount=${extraction.aggregate.matchCount} window=${window}`);
  return extraction;
}

export async function extractAndSaveFeaturesForPlayerFromDb(
  puuid: string,
  options: ExtractFromDbOptions = {}
): Promise<FeatureExtractionResult> {
  const rawMatches = await analysisRepository.findRawMatchesByPuuid(puuid, options.limit ?? 20);
  return extractAndSaveFeaturesFromRawMatches(puuid, rawMatches, options);
}
