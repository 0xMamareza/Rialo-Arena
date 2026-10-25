// Run with: node scripts/verify-localized-result-card.cjs
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness compiles TSX without browser/test-runner dependencies. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const filename = path.join(root, "src/app/quiz/_components/result-card-generator.tsx");
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled.require = (name) => {
  if (name.endsWith(".module.css")) return {};
  if (name === "@/app/_components/language-provider") return {};
  if (name === "@/lib/config/public-site-url") return { getPublicSiteUrl: () => "https://arena.example/" };
  if (name === "@/lib/share/arena-result") return {};
  return require(name);
};
compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);

const draws = [];
const context = new Proxy({
  direction: "ltr", textAlign: "left", font: "16px sans-serif", letterSpacing: "0px",
  measureText(text) { return { width: Array.from(text).length * (Number(this.font.match(/([\d.]+)px/)?.[1]) || 16) * 0.6 }; },
  fillText(text, x, y, maxWidth) { draws.push({ text, x, y, maxWidth, direction: this.direction, align: this.textAlign, font: this.font, spacing: this.letterSpacing }); },
  createLinearGradient() { return { addColorStop() {} }; },
  createRadialGradient() { return { addColorStop() {} }; },
}, { get(target, key) { return key in target ? target[key] : () => {}; } });
const data = Object.freeze({ username: "canonical_user", profileImageUrl: "https://avatar.example/a.png", score: 1234, personalBestScore: 2000, correctCount: 7, timeoutCount: 2, completedRuns: 4, globalRank: 12, tier: "Explorer", isPersonalBest: true });
const original = JSON.stringify(data);
const t = (source, params) => {
  const value = source === "Explorer" ? "کاوشگر بسیار بسیار طولانی" : `فارسی ${source}`;
  return value.replace(/\{(\w+)\}/g, (match, key) => String(params?.[key] ?? match));
};
const savedFetch = global.fetch;
const savedBitmap = global.createImageBitmap;
global.fetch = async () => ({ ok: true, blob: async () => new Blob() });
global.createImageBitmap = async () => ({ width: 100, height: 100, close() {} });
(async () => {
  try {
    await compiled.exports.renderResultCard({ getContext: () => context }, data, { t, locale: "fa", direction: "rtl" });
    const tier = draws.find(({ text }) => text === t("Explorer"));
    assert.ok(tier, "Canvas must translate the display tier without changing its canonical value");
    assert.equal(tier.direction, "rtl");
    assert.equal(tier.align, "right");
    assert.ok(tier.maxWidth <= 790, "Long Unicode tier labels need an explicit width bound");
    assert.ok(draws.some(({ text }) => text === (1234).toLocaleString("fa")), "Canvas scores must use the chosen locale");
    for (const label of ["CURRENT RUN", "PERSONAL BEST", "ARENA IDENTITY", "CORRECT", "TIMEOUTS", "GLOBAL PB RANK", "RUNS", "RIALO ARENA RESULT"]) {
      const draw = draws.find(({ text }) => text === t(label));
      assert.ok(draw, `Missing translated canvas label: ${label}`);
      assert.ok(Number.isFinite(draw.maxWidth), `Label must fit a bounded area: ${label}`);
      assert.equal(draw.direction, "rtl");
      assert.equal(draw.spacing, "0px", "Cursive text must not be letter-spaced");
    }
    const handle = draws.find(({ text }) => text === "@canonical_user");
    assert.equal(handle.direction, "ltr", "Handles remain LTR inside an RTL card");
    assert.equal(JSON.stringify(data), original, "Rendering must not mutate canonical result data");
    draws.length = 0;
    await compiled.exports.renderResultCard({ getContext: () => context }, { ...data, globalRank: null }, { t, locale: "fa", direction: "rtl" });
    assert.equal(draws.find(({ text }) => text === t("UNRANKED"))?.direction, "rtl", "A translated unranked value is prose, not an LTR number");
    console.log("Localized result card: translated labels, RTL, Unicode widths, locale scores and canonical state verified.");
  } finally { global.fetch = savedFetch; global.createImageBitmap = savedBitmap; }
})().catch((error) => { console.error(error); process.exitCode = 1; });
