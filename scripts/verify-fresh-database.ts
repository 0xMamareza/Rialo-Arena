import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { config } from "dotenv";
import { Pool } from "pg";

import { getToolingDatabaseEnvironment } from "../src/server/config/environment";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

function runNpmScript(name: string, environment: NodeJS.ProcessEnv) {
  const result = spawnSync("npm", ["run", name], {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit",
  });

  assert.equal(result.status, 0, `${name} failed against the fresh database`);
}

async function main() {
  const database = getToolingDatabaseEnvironment();
  const baseUrl = new URL(database.toolingDatabaseUrl);
  const databaseName = `rialo_arena_verify_${randomUUID().replaceAll("-", "")}`;
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";
  const verificationUrl = new URL(baseUrl);
  verificationUrl.pathname = `/${databaseName}`;
  const adminPool = new Pool({
    connectionString: adminUrl.toString(),
    max: 1,
    ssl: database.tlsMode === "verify-full"
      ? { rejectUnauthorized: true }
      : false,
  });

  try {
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    const environment = {
      ...process.env,
      DATABASE_URL: verificationUrl.toString(),
      DATABASE_DIRECT_URL: "",
      DATABASE_CONNECTION_MODE: "direct",
      DATABASE_TLS_MODE: database.tlsMode,
    };
    runNpmScript("db:migrate", environment);
    runNpmScript("db:seed", environment);
    runNpmScript("db:verify", environment);
    console.log("Verified migrate, seed, and exact DB verification on a fresh database.");
  } finally {
    await adminPool.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Fresh database verification failed: ${error.message}`
      : "Fresh database verification failed.",
  );
  process.exitCode = 1;
});
