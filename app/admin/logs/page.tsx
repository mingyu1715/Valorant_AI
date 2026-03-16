import { cookies } from "next/headers";

import { AdminLogConsole } from "@/components/admin-log-console";
import { ADMIN_SESSION_COOKIE, hasAdminAccessConfigured, isAdminSessionAuthorized } from "@/src/server/shared";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const enabled = hasAdminAccessConfigured();
  const cookieStore = await cookies();
  const authorized = enabled && isAdminSessionAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return <AdminLogConsole enabled={enabled} authorized={authorized} />;
}
