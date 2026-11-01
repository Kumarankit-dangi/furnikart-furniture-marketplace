export const TEST_DATABASE_HOST =
  "ep-misty-boat-b5wwlpoa-pooler.c-7.us-east-2.aws.neon.tech";
export const TEST_DATABASE_NAME = "neondb";
export const TEST_DATABASE_USER = "neondb_owner";

export function assertTestDatabaseTarget(databaseUrl) {
  let target;

  try {
    target = new URL(databaseUrl);
  } catch {
    throw new Error("Test database target rejected: invalid database URL.");
  }

  let databaseName;
  let databaseUser;
  try {
    databaseName = decodeURIComponent(target.pathname.slice(1));
    databaseUser = decodeURIComponent(target.username);
  } catch {
    throw new Error("Test database target rejected: invalid database identity.");
  }

  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    target.hostname.toLowerCase() !== TEST_DATABASE_HOST ||
    databaseName !== TEST_DATABASE_NAME ||
    databaseUser !== TEST_DATABASE_USER
  ) {
    throw new Error("Test database target rejected: host, database, or user mismatch.");
  }
}
