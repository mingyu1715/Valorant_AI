import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __valorantPrismaClient: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient();
}

export const prisma = globalThis.__valorantPrismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__valorantPrismaClient = prisma;
}
