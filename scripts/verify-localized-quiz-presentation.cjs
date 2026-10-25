// Run with: node scripts/verify-localized-quiz-presentation.cjs
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness compiles TSX without browser/test-runner dependencies. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const filename = path.resolve(__dirname, "../src/app/quiz/quiz-player.tsx");
const options = Object.freeze(["One", "Two", "Three", "Four"].map((text, index) => Object.freeze({ index, label: ["A", "B", "C", "D"][index], text })));
const state = Object.freeze({ attemptId: "existing-attempt", status: "active", questionCount: 15, totalScore: 1234, correctCount: 2, timeoutCount: 0, position: 3, serverNow: "2026-10-24T00:00:00.000Z", currentQuestion: Object.freeze({ position: 3, questionText: "Which option?", options, activatedAt: "2026-10-24T00:00:00.000Z", deadlineAt: "2026-10-24T00:00:20.000Z" }) });
const original = JSON.stringify(state);
let locale = "en";
let stateIndex = 0;
let refIndex = 0;
let callbackIndex = 0;
let effects = [];
const refs = [];
const callbacks = [];
const requests = [];
const router = { replace() {} };
const react = {
  useState(initial) { const index = stateIndex++; return [index === 0 ? "playing" : index === 1 ? state : initial, () => {}]; },
  useRef(initial) { const index = refIndex++; return refs[index] ??= { current: index === 0 ? '"canonical-etag"' : initial }; },
  useCallback(callback, deps) { const index = callbackIndex++; const previous = callbacks[index]; if (previous && deps.every((dep, i) => dep === previous.deps[i])) return previous.callback; callbacks[index] = { callback, deps }; return callback; },
  useEffect(callback, deps) { effects.push({ callback, deps }); },
};
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled.require = (name) => {
  if (name.endsWith(".module.css")) return {};
  if (name === "react") return react;
  if (name === "@/app/_components/language-selector") return { LanguageSelector: () => null };
  if (name === "@/app/_components/language-provider") return { useI18n: () => ({ locale, direction: locale === "fa" ? "rtl" : "ltr", t: (source) => locale === "en" ? source : `ترجمه ${source}` }) };
  if (name === "next/navigation") return { useRouter: () => router };
  if (name === "next/image" || name === "next/link") return () => null;
  if (name === "@/lib/identity/username") return { RIALO_AVATAR_FALLBACK_PATH: "/brand/fallback.svg" };
  if (name === "@/lib/quiz/domain") return { ANSWER_REVIEW_DURATION_MS: 3000 };
  if (name === "./_components/result-card-generator") return { ResultCardGenerator: () => null };
  return require(name);
};
compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
function render() {
  stateIndex = refIndex = callbackIndex = 0;
  effects = [];
  return compiled.exports.QuizPlayer({ className: "", initialAttemptId: state.attemptId, profile: { username: "canonical_user", profileImageUrl: "https://avatar.example/a.png" } });
}
function descendants(node) { return !node || typeof node !== "object" ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(descendants)]; }
const savedFetch = global.fetch;
global.fetch = async (url, init) => {
  requests.push({ url, init });
  return new Response(JSON.stringify(state), { status: 200, headers: { etag: '"next-etag"' } });
};
try {
  render();
  const englishEffects = effects.map(({ deps }) => deps);
  locale = "fa";
  const tree = render();
  const nodes = descendants(tree);
  assert.equal(tree.props.dir, "rtl");
  assert.ok(nodes.some(({ props }) => props.children === "ترجمه Which option?"), "Question text must be translated only for presentation");
  assert.ok(nodes.some(({ props }) => props.children === "ترجمه Two"), "Option text must be translated only for presentation");
  assert.ok(nodes.some(({ type, props }) => type === "time" && props.children === (20).toLocaleString("fa", { minimumIntegerDigits: 2, useGrouping: false })), "Timer display must use locale digits without modifying its clock");
  assert.ok(nodes.some(({ props }) => props.children === "۰۳ / ۱۵"), "Question position must use locale digits without changing the canonical position");
  assert.deepEqual(effects.map(({ deps }) => deps), englishEffects, "Changing locale must not reschedule attempt lifecycle effects");
  const choices = nodes.filter(({ type, props }) => type === "button" && props["data-result"] === undefined && props.children?.[1]?.props?.children === "ترجمه Two");
  assert.equal(choices.length, 1);
  choices[0].props.onClick();
  assert.equal(requests.length, 1, "No start or restore request is caused by translation");
  assert.equal(requests[0].url, "/api/quiz/answer/existing-attempt");
  assert.equal(requests[0].init.headers["If-Match"], '"canonical-etag"');
  assert.deepEqual(JSON.parse(requests[0].init.body), { choiceIndex: 1 });
  assert.equal(JSON.stringify(state), original, "Canonical state, option order and identity must remain unchanged");
  console.log("Localized quiz: display translation/digits, stable lifecycle, attempt ID, ETag and choice authority verified.");
} finally { global.fetch = savedFetch; }
