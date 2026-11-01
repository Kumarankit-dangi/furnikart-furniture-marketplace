import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import { assertTestDatabaseTarget } from "./src/db/test-target.mjs";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const envPath = resolve(projectRoot, ".env.test.local");
const loaded = dotenv.config({ path: envPath, override: true, quiet: true });

if (loaded.error || !loaded.parsed?.DATABASE_URL) {
  throw new Error("Test database configuration is missing DATABASE_URL.");
}

const databaseUrl = loaded.parsed.DATABASE_URL;
assertTestDatabaseTarget(databaseUrl);

export default defineConfig({
  dialect: "postgresql",
  schema: resolve(projectRoot, "src/db/schema.ts"),
  out: resolve(projectRoot, "drizzle-test"),
  dbCredentials: { url: databaseUrl },
});
