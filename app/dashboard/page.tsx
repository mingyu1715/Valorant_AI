import { DashboardShell } from "@/components/dashboard-shell";
import { getConfiguredRiotMatchApiClientKind } from "@/src/server/match-sync/client";
import { DEFAULT_RIOT_ID, DEFAULT_RIOT_TAG } from "@/src/server/shared";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const authState = Array.isArray(params.rso) ? params.rso[0] : params.rso;
  const authProvider = (process.env.RIOT_AUTH_PROVIDER ?? "mock").trim().toLowerCase();
  const matchProvider = getConfiguredRiotMatchApiClientKind();
  const analysisProvider = (process.env.LLM_ANALYSIS_PROVIDER ?? "mock").trim().toLowerCase();
  const showMockPreview = authProvider === "mock" && matchProvider === "mock" && analysisProvider === "mock";
  const mockRiotId = (process.env.MOCK_RIOT_GAME_NAME ?? "MockPlayer").trim() || "MockPlayer";
  const mockRiotTag = (process.env.MOCK_RIOT_TAG_LINE ?? "KR1").trim() || "KR1";
  const initialRiotId = showMockPreview ? mockRiotId : DEFAULT_RIOT_ID;
  const initialRiotTag = showMockPreview ? mockRiotTag : DEFAULT_RIOT_TAG;

  return (
    <DashboardShell
      initialRiotId={initialRiotId}
      initialRiotTag={initialRiotTag}
      authState={authState}
      showMockPreview={showMockPreview}
    />
  );
}
