import { resolve } from "node:path";

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

export function requireDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Create an ignored .env.local from .env.example.",
    );
  }

  return databaseUrl;
}

export function createToolingPool() {
  return new Pool({
    connectionString: requireDatabaseUrl(),
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 1_000,
    allowExitOnIdle: true,
  });
}
