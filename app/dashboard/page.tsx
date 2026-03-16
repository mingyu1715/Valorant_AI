import { DashboardShell } from "@/components/dashboard-shell";
import { DEFAULT_RIOT_ID, DEFAULT_RIOT_TAG } from "@/src/server/shared";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const authState = Array.isArray(params.rso) ? params.rso[0] : params.rso;

  return (
    <DashboardShell
      initialRiotId={DEFAULT_RIOT_ID}
      initialRiotTag={DEFAULT_RIOT_TAG}
      authState={authState}
    />
  );
}
