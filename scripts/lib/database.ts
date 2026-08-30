import { resolve } from "node:path";

import { config } from "dotenv";
import { Pool } from "pg";

import { getToolingDatabaseEnvironment } from "../../src/server/config/environment";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

export function requireDatabaseUrl() {
  return getToolingDatabaseEnvironment().toolingDatabaseUrl;
}

export function createToolingPool() {
  const database = getToolingDatabaseEnvironment();

  return new Pool({
    connectionString: database.toolingDatabaseUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 1_000,
    allowExitOnIdle: true,
    ssl: database.tlsMode === "verify-full"
      ? { rejectUnauthorized: true }
      : false,
  });
}
