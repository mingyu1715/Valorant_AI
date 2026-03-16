import {
  buildPlayerOverview,
  buildSampleAnalysisInputs,
  summarizeAttackDefense,
  summarizeClutch,
  summarizeEconomy,
  summarizeUtility
} from "@/src/server/analytics";
import { analyzeSectionWithGemini } from "@/src/server/gemini";
import { buildPlayerPayload, fetchRecentMatchesForPlayer, getAccountInfo } from "@/src/server/riot";
import {
  AppError,
  DEFAULT_RIOT_ID,
  DEFAULT_RIOT_MATCH_COUNT,
  DEFAULT_RIOT_TAG,
  SECTION_CONFIGS,
  assertValidRiotIdentity,
  generateJobId,
  getEnv,
  getIntEnv,
  getJobStore,
  logDev,
  logError,
  trimJobStore,
  useSampleAnalytics
} from "@/src/server/shared";
import type { AnalysisSnapshot, JobSectionPayload, PreparedAnalysisInput, SectionPayload } from "@/src/server/types";

export async function prepareAnalysisInputs(riotId?: string, riotTag?: string): Promise<PreparedAnalysisInput> {
  const effectiveRiotId = (riotId || getEnv("RIOT_ID", DEFAULT_RIOT_ID)).trim();
  const effectiveRiotTag = (riotTag || getEnv("RIOT_TAG", DEFAULT_RIOT_TAG)).trim();
  assertValidRiotIdentity(effectiveRiotId, effectiveRiotTag);

  if (useSampleAnalytics()) {
    logDev("USE_SAMPLE_ANALYTICS=1, 샘플 분석 입력을 사용합니다.");
    let accountInfo = {
      puuid: "sample-puuid",
      gameName: effectiveRiotId,
      tagLine: effectiveRiotTag,
      requestUrl: ""
    };

    if (getEnv("RIOT_API_KEY")) {
      try {
        accountInfo = await getAccountInfo(effectiveRiotId, effectiveRiotTag);
      } catch {}
    }

    return buildSampleAnalysisInputs(accountInfo);
  }

  const accountInfo = await getAccountInfo(effectiveRiotId, effectiveRiotTag);
  const matchCount = getIntEnv("RIOT_MATCH_COUNT", DEFAULT_RIOT_MATCH_COUNT);
  const matches = await fetchRecentMatchesForPlayer(accountInfo.puuid, matchCount);
  return {
    player: buildPlayerPayload(accountInfo),
    overview: buildPlayerOverview(accountInfo, matches),
    sections: [
      summarizeAttackDefense(accountInfo, matches),
      summarizeEconomy(accountInfo, matches),
      summarizeClutch(accountInfo, matches),
      summarizeUtility(accountInfo, matches)
    ]
  };
}

async function runSectionAnalyses(
  player: PreparedAnalysisInput["player"],
  overview: PreparedAnalysisInput["overview"],
  sections: PreparedAnalysisInput["sections"],
  callbacks: {
    onSectionStart?: (section: SectionPayload) => void;
    onSectionResult?: (section: JobSectionPayload) => void;
  } = {}
): Promise<JobSectionPayload[]> {
  const results: JobSectionPayload[] = [];

  for (const section of sections) {
    callbacks.onSectionStart?.(section);
    try {
      const analysis = await analyzeSectionWithGemini(player, overview, section);
      const result: JobSectionPayload = {
        ...section,
        status: "completed",
        analysis,
        error: null
      };
      results.push(result);
      callbacks.onSectionResult?.(result);
    } catch (error) {
      const message = error instanceof AppError ? error.message : `서버 내부 오류가 발생했습니다. (${String(error)})`;
      logError("analysis", `${section.title} 섹션 분석에 실패했습니다.`, {
        sectionKey: section.key,
        sectionTitle: section.title,
        error: message
      });
      const result: JobSectionPayload = {
        ...section,
        status: "error",
        analysis: null,
        error: message
      };
      results.push(result);
      callbacks.onSectionResult?.(result);
    }
  }

  return results;
}

function buildJobPayload(jobId: string, riotId: string, riotTag: string): AnalysisSnapshot {
  return {
    jobId,
    status: "queued",
    currentStep: "작업 대기 중입니다.",
    player: {
      riotId,
      riotTag,
      puuidMasked: ""
    },
    overview: {
      facts: []
    },
    progress: {
      completed: 0,
      total: SECTION_CONFIGS.length,
      currentKey: null
    },
    sections: SECTION_CONFIGS.map((config) => ({
      key: config.key,
      title: config.title,
      status: "pending",
      facts: [],
      raw: {},
      analysis: null,
      error: null
    })),
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function getJobSnapshot(jobId: string): AnalysisSnapshot | null {
  const snapshot = getJobStore().get(jobId);
  return snapshot ? structuredClone(snapshot) : null;
}

function mutateJob(jobId: string, mutator: (job: AnalysisSnapshot) => void): void {
  const job = getJobStore().get(jobId);
  if (!job) {
    return;
  }
  mutator(job);
  job.updatedAt = Date.now();
}

function updateJobAfterCollection(jobId: string, prepared: PreparedAnalysisInput): void {
  mutateJob(jobId, (job) => {
    job.status = "analyzing";
    job.currentStep = "세분화된 데이터 준비가 끝났습니다. 섹션별 AI 분석을 시작합니다.";
    job.player = prepared.player;
    job.overview = prepared.overview;

    for (const sourceSection of prepared.sections) {
      const targetSection = job.sections.find((section) => section.key === sourceSection.key);
      if (!targetSection) {
        continue;
      }
      targetSection.facts = sourceSection.facts;
      targetSection.raw = sourceSection.raw;
      targetSection.status = "pending";
    }
  });
}

function markJobSectionRunning(jobId: string, section: SectionPayload): void {
  mutateJob(jobId, (job) => {
    job.status = "analyzing";
    job.currentStep = `${section.title} 분석을 진행 중입니다.`;
    job.progress.currentKey = section.key;
    const targetSection = job.sections.find((candidate) => candidate.key === section.key);
    if (targetSection) {
      targetSection.status = "running";
    }
  });
}

function applyJobSectionResult(jobId: string, sectionResult: JobSectionPayload): void {
  mutateJob(jobId, (job) => {
    const targetSection = job.sections.find((candidate) => candidate.key === sectionResult.key);
    if (targetSection) {
      targetSection.status = sectionResult.status;
      targetSection.analysis = sectionResult.analysis;
      targetSection.error = sectionResult.error;
      targetSection.facts = sectionResult.facts;
      targetSection.raw = sectionResult.raw;
    }

    job.progress.completed = job.sections.filter((section) => section.status === "completed").length;
    job.currentStep =
      sectionResult.status === "error"
        ? `${sectionResult.title} 분석에서 오류가 났지만 다음 섹션으로 진행합니다.`
        : `${sectionResult.title} 분석이 완료되었습니다.`;
  });
}

function finalizeJob(jobId: string): void {
  mutateJob(jobId, (job) => {
    const errorCount = job.sections.filter((section) => section.status === "error").length;
    const completed = job.sections.filter((section) => section.status === "completed").length;
    job.status = "completed";
    job.progress.completed = completed;
    job.progress.currentKey = null;
    job.currentStep = errorCount
      ? `${SECTION_CONFIGS.length}개 섹션 중 ${completed}개 완료, ${errorCount}개 오류로 종료되었습니다.`
      : `${SECTION_CONFIGS.length}개 섹션 분석이 모두 완료되었습니다.`;
  });
}

function failJob(jobId: string, message: string): void {
  mutateJob(jobId, (job) => {
    logError("job", "분석 작업이 실패했습니다.", {
      jobId,
      riotId: job.player.riotId,
      riotTag: job.player.riotTag,
      message
    });
    job.status = "failed";
    job.currentStep = message;
    job.error = message;
    job.progress.currentKey = null;
  });
}

async function runJobPipeline(jobId: string, riotId: string, riotTag: string): Promise<void> {
  try {
    mutateJob(jobId, (job) => {
      job.status = "collecting";
      job.currentStep = "Riot 공식 API에서 계정과 최근 매치를 수집하고 있습니다.";
    });

    const prepared = await prepareAnalysisInputs(riotId, riotTag);
    updateJobAfterCollection(jobId, prepared);

    await runSectionAnalyses(prepared.player, prepared.overview, prepared.sections, {
      onSectionStart: (section) => markJobSectionRunning(jobId, section),
      onSectionResult: (sectionResult) => applyJobSectionResult(jobId, sectionResult)
    });

    finalizeJob(jobId);
  } catch (error) {
    if (error instanceof AppError) {
      failJob(jobId, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    logError("job", "예상치 못한 작업 오류가 발생했습니다.", {
      jobId,
      riotId,
      riotTag,
      error: message
    });
    failJob(jobId, `서버 내부 오류가 발생했습니다. (${message})`);
  }
}

export function createAnalysisJob(riotId?: string, riotTag?: string): AnalysisSnapshot {
  const effectiveRiotId = (riotId || getEnv("RIOT_ID", DEFAULT_RIOT_ID)).trim();
  const effectiveRiotTag = (riotTag || getEnv("RIOT_TAG", DEFAULT_RIOT_TAG)).trim();
  assertValidRiotIdentity(effectiveRiotId, effectiveRiotTag);

  const jobId = generateJobId();
  const snapshot = buildJobPayload(jobId, effectiveRiotId, effectiveRiotTag);
  getJobStore().set(jobId, snapshot);
  trimJobStore();
  logDev(`작업 생성: ${jobId} (${effectiveRiotId}#${effectiveRiotTag})`);

  setTimeout(() => {
    void runJobPipeline(jobId, effectiveRiotId, effectiveRiotTag);
  }, 0);

  return structuredClone(snapshot);
}
