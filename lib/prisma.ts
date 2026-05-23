import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function runtimeDatabaseUrl() {
  if (process.env.NODE_ENV !== "production" && process.env.USE_DATABASE_URL_FALLBACK === "true") {
    return process.env.DATABASE_URL_FALLBACK || directSupabaseUrlFromPooler(process.env.DATABASE_URL) || process.env.DATABASE_URL;
  }

  return process.env.DATABASE_URL;
}

function directSupabaseUrlFromPooler(databaseUrl?: string) {
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);
    if (url.hostname.includes(".pooler.supabase.com") && url.port === "6543") {
      url.port = "5432";
      url.searchParams.delete("pgbouncer");
      if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
      return url.toString();
    }
  } catch (error) {
    console.warn("[prisma] could not derive local direct fallback URL", {
      message: error instanceof Error ? error.message : "Unknown URL parsing error"
    });
  }

  return undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: runtimeDatabaseUrl()
      ? {
          db: {
            url: runtimeDatabaseUrl()
          }
        }
      : undefined
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
