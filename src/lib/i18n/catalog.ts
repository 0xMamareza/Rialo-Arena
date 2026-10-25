import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { normalizeLocale, type Dictionary } from "./core";

export async function loadDictionary(
  value: unknown,
  directory = join(process.cwd(), "src/lib/i18n/messages"),
): Promise<Dictionary> {
  const locale = normalizeLocale(value);
  if (locale === "en") return {};

  let content: string;
  try {
    content = await readFile(join(directory, `${locale}.json`), "utf8");
  } catch (error) {
    // Catalogs may arrive independently; a missing language keeps English usable.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
