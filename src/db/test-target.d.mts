export const TEST_DATABASE_HOST: string;
export const TEST_DATABASE_NAME: string;
export const TEST_DATABASE_USER: string;
export function assertTestDatabaseTarget(
  databaseUrl: string | undefined,
): asserts databaseUrl is string;
