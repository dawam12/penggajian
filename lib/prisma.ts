import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | null;
  pool: pg.Pool | null;
};

export function getPrisma(): PrismaClient {
  if (typeof window !== "undefined") {
    return null as any;
  }

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new pg.Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 4, // limit max connections to prevent exhaustion
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  // Invalidate cached prisma client if new models (like attendance) are missing
  if (globalForPrisma.prisma && !("attendance" in globalForPrisma.prisma)) {
    console.log("⚠️ Invalidating stale PrismaClient cache to include newly added models...");
    globalForPrisma.prisma = null;
  }

  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}

// Proxy wrapper ensures prisma instance is evaluated dynamically on every method call
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    if (!client) return undefined;
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
