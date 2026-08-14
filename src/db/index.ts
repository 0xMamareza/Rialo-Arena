import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for PostgreSQL access");
}

const globalForDatabase = globalThis as typeof globalThis & {
  rialoArenaPool?: Pool;
};

function createPool() {
  return new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
}

const pool = globalForDatabase.rialoArenaPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.rialoArenaPool = pool;
}

export const db = drizzle({ client: pool, schema });
