import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { getToolingDatabaseEnvironment } from "./src/server/config/environment";

config({ path: ".env.local", quiet: true });

const databaseUrl = getToolingDatabaseEnvironment().toolingDatabaseUrl;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
