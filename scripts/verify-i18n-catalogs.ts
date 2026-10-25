import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const normalize = (text: string) => text.replace(/\s+/gu, " ").trim();
const locales = ["en", "zh-CN", "ko", "vi", "ru", "uk", "id", "hi", "tr", "th", "pt-BR", "ur", "bn", "ar", "fa"];
const dir = path.join(root, "src/lib/i18n/messages");
const expected = new Set<string>();
const dynamicFiles: string[] = [];
function scan(file: string) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments[0]) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) expected.add(normalize(arg.text));
      else dynamicFiles.push(path.relative(root, file));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/u.test(file)) scan(file);
  }
}
walk(path.join(root, "src/app"));
scan(path.join(root, "src/lib/share/arena-result.ts"));
const bank = JSON.parse(fs.readFileSync(path.join(root, "data/quiz/rialo-community-quiz-89.json"), "utf8"));
assert.equal(bank.questions.length, 89, "canonical question bank must remain intact");
for (const q of bank.questions) {
  expected.add(normalize(q.question));
  for (const option of Object.values(q.options)) expected.add(normalize(String(option)));
}
assert.ok(expected.size >= 89, "translation inventory must include the whole bank");
for (const message of ["Authentication is required.", "The quiz request could not be completed.", "X usernames can contain at most 15 characters.", "Use only letters, numbers, and underscores.", "GAS", "STORAGE", "sec"]) expected.add(message);
const placeholders = (value: string) => [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/gu)].map(m => m[1]).sort();
let baseKeys: string[] = [];
const results = [];
for (const locale of locales) {
  const file = path.join(dir, `${locale}.json`);
  assert.ok(fs.existsSync(file), `Missing required ${locale} catalog`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>;
  const keys = Object.keys(dict).sort();
  if (locale === "en") baseKeys = keys;
  assert.deepEqual(keys, baseKeys, `${locale}: keys must match English exactly`);
  for (const key of expected) assert.ok(Object.hasOwn(dict, key), `${locale}: missing message ${key}`);
  for (const [key, value] of Object.entries(dict)) {
    assert.equal(key, normalize(key), `${locale}: non-normalized message key`);
    assert.equal(typeof value, "string");
    assert.ok(value.trim(), `${locale}: empty translation for ${key}`);
    assert.deepEqual(placeholders(value), placeholders(key), `${locale}: interpolation changed in ${key}`);
    assert.ok(!/ZXQKEEP\d+QXZ|⟪\d+⟫|⟦\d+⟧/u.test(value), `${locale}: translation marker leaked`);
  }
  assert.ok(!Object.hasOwn(dict, "correctOption"), "catalog must not contain answer keys");
  results.push({ locale, messages: keys.length, required: expected.size, changed: Object.entries(dict).filter(([k,v]) => k !== v).length });
}
console.log(JSON.stringify({ passed: true, localeCount: results.length, questionCount: bank.questions.length, results, dynamicTranslationCallsites: [...new Set(dynamicFiles)] }, null, 2));
