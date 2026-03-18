import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __valorantPrismaClient: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL 환경 변수가 비어 있습니다. DB 모드를 사용할 때 값을 설정해 주세요.");
  }

  const adapter = new PrismaPg({
    connectionString
  });
  return new PrismaClient({
    adapter
  });
}

export const prisma = globalThis.__valorantPrismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__valorantPrismaClient = prisma;
}
