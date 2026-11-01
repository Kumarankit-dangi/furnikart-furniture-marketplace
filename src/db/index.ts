import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { assertTestDatabaseTarget } from "./test-target.mjs";

const databaseUrl = process.env.DATABASE_URL;

if (process.env.FURNIKART_TEST_DATABASE === "1") {
  assertTestDatabaseTarget(databaseUrl);
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
