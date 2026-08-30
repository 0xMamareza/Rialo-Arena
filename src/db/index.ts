import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseEnvironment } from "@/server/config/environment";

import * as schema from "./schema";

const database = getDatabaseEnvironment();

const globalForDatabase = globalThis as typeof globalThis & {
  rialoArenaPool?: Pool;
};

function createPool() {
  return new Pool({
    connectionString: database.databaseUrl,
    max: process.env.NODE_ENV === "production"
      ? database.connectionMode === "pooled" ? 5 : 10
      : 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: process.env.NODE_ENV !== "production",
    ssl: database.tlsMode === "verify-full"
      ? { rejectUnauthorized: true }
      : false,
  });
}

const pool = globalForDatabase.rialoArenaPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.rialoArenaPool = pool;
}

export const db = drizzle({ client: pool, schema });
