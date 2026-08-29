import { resolve } from "node:path";

import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

async function main() {
  const { runMaintenance } = await import(
    "../src/server/maintenance/run-maintenance"
  );
  const result = await runMaintenance();

  console.log("Rialo Arena maintenance completed.");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
    console.error(
      error instanceof Error
        ? `Rialo Arena maintenance failed: ${error.message}`
        : "Rialo Arena maintenance failed.",
    );
    process.exitCode = 1;
  });
