import assert from "node:assert/strict";
import { createArenaResultShareUrl } from "../src/lib/share/arena-result";

const input = Object.freeze({ arenaUrl: "https://arena.example/", score: 1234, tier: "Explorer" });
const calls: Array<{ source: string; params?: Record<string, string | number> }> = [];
const t = (source: string, params?: Record<string, string | number>) => {
  calls.push({ source, params });
  if (source === "Explorer") return "کاوشگر";
  if (params) return `امتیاز ${params.score}؛ رتبه ${params.tier}؛ @RialoHQ`;
  return source;
};
const localized = new URL(createArenaResultShareUrl({ ...input, locale: "fa", t }));
assert.equal(localized.searchParams.get("text"), `امتیاز ${new Intl.NumberFormat("fa").format(1234)}؛ رتبه کاوشگر؛ @RialoHQ`);
assert.equal(localized.searchParams.get("url"), input.arenaUrl);
assert.ok(calls.some(({ source, params }) => source.includes("{score}") && source.includes("{tier}") && params?.tier === "کاوشگر"));
assert.ok(calls.some(({ params }) => params?.maximum === new Intl.NumberFormat("fa", { useGrouping: false }).format(3000)), "The maximum score must be a locale-formatted placeholder too");
assert.deepEqual(input, { arenaUrl: "https://arena.example/", score: 1234, tier: "Explorer" });
assert.equal(new URL(createArenaResultShareUrl(input)).searchParams.get("text"), "I scored 1234/3000 in Rialo Arena and reached Explorer. Test your @RialoHQ knowledge.");
console.log("Localized Arena share: placeholders, Unicode, canonical input and English fallback verified.");
