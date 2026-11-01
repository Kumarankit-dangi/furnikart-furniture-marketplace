import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { assertTestDatabaseTarget } from "../src/db/test-target.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const loaded = dotenv.config({
  path: join(projectRoot, ".env.test.local"),
  override: true,
  quiet: true,
});

if (loaded.error || !loaded.parsed?.DATABASE_URL) {
  throw new Error("Test app configuration is missing DATABASE_URL.");
}

const databaseUrl = loaded.parsed.DATABASE_URL;
assertTestDatabaseTarget(databaseUrl);
process.env.DATABASE_URL = databaseUrl;

const childEnv = {
  PATH: process.env.PATH,
  SystemRoot: process.env.SystemRoot,
  WINDIR: process.env.WINDIR,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
  USERPROFILE: process.env.USERPROFILE,
  HOME: process.env.HOME,
  NODE_ENV: "development",
  DATABASE_URL: databaseUrl,
  FURNIKART_TEST_DATABASE: "1",
  NEXT_TELEMETRY_DISABLED: "1",
};

for (const key of Object.keys(childEnv)) {
  if (childEnv[key] === undefined) delete childEnv[key];
}

const nextCli = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const child = spawn(
  process.execPath,
  [nextCli, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3020"],
  { cwd: projectRoot, env: childEnv, stdio: "inherit", detached: false },
);

const signalExitCodes = { SIGINT: 130, SIGTERM: 143 };
let forwardedSignal;
const forwardSignal = (signal) => {
  if (forwardedSignal) return;
  forwardedSignal = signal;
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.kill(signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
};
const onSigint = () => forwardSignal("SIGINT");
const onSigterm = () => forwardSignal("SIGTERM");
process.on("SIGINT", onSigint);
process.on("SIGTERM", onSigterm);

let exitCode;
try {
  exitCode = await new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      resolveExit(
        forwardedSignal
          ? signalExitCodes[forwardedSignal]
          : code ?? signalExitCodes[signal] ?? 1,
      );
    });
  });
} finally {
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
}

process.exitCode = exitCode;
