import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const manifestPath = resolve(
    process.cwd(),
    ".next/server/app-paths-manifest.json",
  );
  const manifest = JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as Record<string, string>;

  for (const route of [
    "/api/quiz/attempt/[attemptId]/route",
    "/api/quiz/answer/[attemptId]/route",
  ]) {
    assert.ok(manifest[route], `Production route manifest is missing ${route}`);
  }

  console.log("Verified both quiz attempt routes in the production manifest.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `Production build verification failed: ${error.message}`
      : "Production build verification failed.",
  );
  process.exitCode = 1;
});
