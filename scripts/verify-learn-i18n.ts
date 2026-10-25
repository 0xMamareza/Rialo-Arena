import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const learn = path.join(root, "src/app/learn");
const files = fs.readdirSync(path.join(learn, "_components"))
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => path.join(learn, "_components", file));
files.push(path.join(learn, "page.tsx"));
const preserved = new Set([
  "Rialo", "RLO", "REX", "IPC", "SCALE", "AGP", "Latch", "ServicePaymaster",
  "SERVICEPAYMASTER", "RIALO EDGE", "RIALO VM", "CRUISE", "OMNI ACCOUNT", "INTEROP",
  "RISC-V / SVM", "Agent Grand Prix", "Project 1337", "Stake-for-Service",
  "MCP / Sigil / OpenRouter / Latch", "lat_7F2A...", "Retry-After: 60",
  "GET /v1/chat/completions", "POST /v1/chat/completions", "GET /admin/users",
  // Example JSON field names, scoped token prefixes, and validator identifiers are data.
  "email", "ssn", "lat_...", "V", "B",
]);
const failures: string[] = [];
const phaseCopy = new Set<string>();
const literalKeys = new Set<string>();
let calls = 0;
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && ["eyebrow", "title", "body"].includes(node.name.getText(source)) && ts.isStringLiteral(node.initializer)) {
      phaseCopy.add(node.initializer.text);
    }
    if (ts.isCallExpression(node) && node.expression.getText(source) === "t") {
      calls++;
      const key = node.arguments[0];
      if (key && ts.isStringLiteral(key)) {
        assert.equal(key.text, normalize(key.text), `Non-normalized key: ${key.text}`);
        literalKeys.add(key.text);
      }
    }
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === "textContent" && ts.isStringLiteral(node.initializer) && /[A-Za-z]/.test(node.initializer.text)) {
      failures.push(`${path.relative(root, file)}: untranslated animated label: ${node.initializer.text}`);
    }
    if (ts.isJsxText(node)) {
      const value = normalize(node.getText(source));
      if (/[A-Za-z]/.test(value) && !preserved.has(value)) {
        failures.push(`${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}: untranslated JSX: ${value}`);
      }
    }
    if (ts.isJsxAttribute(node) && ["aria-label", "alt", "title", "sourceLabel", "sourceType"].includes(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const value = node.initializer.text;
      if (/[A-Za-z]/.test(value) && !preserved.has(value)) failures.push(`${path.relative(root, file)}: untranslated ${node.name.getText(source)}: ${value}`);
    }
    if (ts.isJsxAttribute(node) && (node.name.getText(source) === "key" || node.name.getText(source) === "id" || node.name.getText(source).startsWith("data-")) && node.initializer) {
      assert.ok(!/\bt\(/.test(node.initializer.getText(source)), `Translated mechanic identifier in ${file}: ${node.name.getText(source)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
assert.ok(calls > 200, `Expected broad Learn translation coverage; found ${calls} t() calls`);
assert.deepEqual(failures, [], `Untranslated Learn copy:\n${failures.join("\n")}`);
const page = fs.readFileSync(path.join(learn, "page.tsx"), "utf8");
assert.deepEqual([...page.matchAll(/id="(chapter-[^"]+)"/g)].map((match) => match[1]), [
  "chapter-rialo", "chapter-architecture", "chapter-reactive", "chapter-stake-for-service",
  "chapter-project-1337", "chapter-agent-economy", "chapter-latch", "chapter-agp",
]);
assert.match(page, /await getI18n\(\)/, "Server-rendered Learn copy must use the request locale");
for (const name of ["agp-cinematic", "architecture-machine", "latch-cinematic", "project-1337-cinematic", "reactive-cinematic", "scale-cinematic", "stake-service-cinematic", "learn-navigation"]) {
  const text = fs.readFileSync(path.join(learn, "_components", `${name}.tsx`), "utf8");
  assert.match(text, /useI18n\(\)/, `${name} must react to locale changes`);
}
const css = fs.readFileSync(path.join(learn, "learn.module.css"), "utf8");
assert.ok(/unicode-bidi:\s*plaintext/.test(css), "SVG annotations must retain their own text direction");
assert.ok(/overflow-wrap:\s*anywhere/.test(css), "Expanded translations must wrap");
assert.ok(fs.existsSync(path.join(learn, "_components/diagram-text.tsx")), "Translated SVG labels need width fitting without mirroring the diagram");
// Render real Learn components, stubbing only framework/environment boundaries.
// The translator probe records keys; it is deliberately not a locale dictionary.
const require = createRequire(import.meta.url);
const keys = new Set<string>();
let locale = "en";
const i18n = () => ({
  locale,
  direction: locale === "fa" ? "rtl" : "ltr",
  t: (source: string, params?: Record<string, string | number>) => {
    assert.equal(typeof source, "string");
    assert.equal(source, normalize(source));
    keys.add(source);
    const value = source.replace(/\{(\w+)\}/g, (match, key: string) => String(params?.[key] ?? match));
    return locale === "en" || preserved.has(source) ? value : `ترجمه ${value}`;
  },
});
const requireCache = new Map<string, Record<string, unknown>>();
function load(file: string): Record<string, unknown> {
  if (requireCache.has(file)) return requireCache.get(file)!;
  const loaded = { exports: {} as Record<string, unknown> };
  requireCache.set(file, loaded.exports);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: file,
  }).outputText;
  const localRequire = (id: string): unknown => {
    if (id === "@/app/_components/language-provider") return { useI18n: i18n };
    // The shared header control is exercised by the browser verifier, not this Learn-copy probe.
    if (id === "@/app/_components/language-selector") return { LanguageSelector: () => null };
    if (id === "@/lib/i18n/server") return { getI18n: async () => i18n() };
    if (id.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id === "next/font/local") return { __esModule: true, default: () => ({ variable: "learn-font" }) };
    if (id === "next/image") return { __esModule: true, default: (props: Record<string, unknown>) => {
      const imageProps = { ...props };
      delete imageProps.priority;
      return React.createElement("img", imageProps);
    } };
    if (id === "next/link") return { __esModule: true, default: (props: Record<string, unknown>) => React.createElement("a", props) };
    if (id.startsWith("gsap")) return {};
    if (id.startsWith(".")) {
      const target = path.resolve(path.dirname(file), id);
      const resolved = [target, `${target}.tsx`, `${target}.ts`].find((name) => fs.existsSync(name));
      assert.ok(resolved, `Missing import: ${id}`);
      return load(resolved);
    }
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, loaded, loaded.exports);
  return loaded.exports;
}
async function resolveServer(node: React.ReactNode): Promise<React.ReactNode> {
  if (Array.isArray(node)) return React.Children.toArray(await Promise.all(node.map(resolveServer)));
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return node;
  if (typeof node.type === "function" && node.type.constructor.name === "AsyncFunction") {
    return resolveServer(await (node.type as (props: unknown) => Promise<React.ReactNode>)(node.props));
  }
  if (node.props.children !== undefined) {
    const children = await resolveServer(node.props.children);
    return React.cloneElement(node, {}, ...(Array.isArray(children) ? children : [children]));
  }
  return node;
}
const fitText = load(path.join(learn, "_components/diagram-text.tsx")).fitDiagramText as (node: Pick<SVGTextElement, "removeAttribute" | "setAttribute" | "getComputedTextLength">, width: number) => void;
const attributes = new Map<string, string>();
let measuredWidth = 48;
const textNode = {
  removeAttribute: (name: string) => { attributes.delete(name); },
  setAttribute: (name: string, value: string) => { attributes.set(name, value); },
  getComputedTextLength: () => measuredWidth,
};
fitText(textNode, 100);
assert.equal(attributes.has("textLength"), false, "Short labels must not be stretched");
measuredWidth = 400;
fitText(textNode, 100);
assert.equal(attributes.get("textLength"), "100", "Expanded translations must fit the node's real width");
measuredWidth = 60;
fitText(textNode, 100);
assert.equal(attributes.has("textLength"), false, "Changing back to a short locale must remove stale fitting");

const pageModule = load(path.join(learn, "page.tsx"));
const renderPage = async () => renderToStaticMarkup(await resolveServer(await (pageModule.default as () => Promise<React.ReactNode>)()));
const english = await renderPage();
locale = "fa";
const persianProbe = await renderPage();
const exampleData = new Set(["AAPL", "NVDA", "EURUSD", "GOLD", "TSLA", "SPX", "/openai", "/stripe", "/slack"]);
const untranslatedLeaves = [...persianProbe.matchAll(/>([^<>]+)</g)]
  .map((match) => normalize(match[1]))
  .filter((value) => /[A-Za-z]/.test(value) && !value.startsWith("ترجمه ") && !preserved.has(value) && !exampleData.has(value) && !/^[VB]\d+$/.test(value));
assert.deepEqual(untranslatedLeaves, [], "Rendered Learn text bypasses the translator (except documented brands/example data)");
assert.ok(persianProbe.includes("ترجمه The chain meets the world."));
assert.ok(persianProbe.includes("ترجمه Programs can interact with external APIs and real-world systems."));
assert.ok(persianProbe.includes("ترجمه Real-world means bidirectional"));
assert.ok(persianProbe.includes("ترجمه Agents enter a circuit whose checkpoints have not been revealed."));
assert.ok(persianProbe.includes("ترجمه Diagram: signals become a condition, validator agreement, and automatic execution."), "Reactive diagram accessibility description must be localized");
assert.ok(persianProbe.includes('direction="rtl"'), "SVG labels must receive RTL direction");
assert.ok(persianProbe.includes('dir="ltr"'), "Diagrams and navigation scrolling stay LTR");
assert.ok(persianProbe.includes("lat_7F2A...") && persianProbe.includes("225.47"), "Example credentials and market data must not be translated");
const mechanics = (html: string) => [...html.matchAll(/(?:id|data-[\w-]+|d|viewBox)="[^"]*"/g)].map((match) => match[0]);
assert.deepEqual(mechanics(persianProbe), mechanics(english), "Locale changes must preserve diagram paths and animation selectors");
const meta = await (pageModule.generateMetadata as () => Promise<{ title: string }>)();
assert.equal(meta.title, "ترجمه Learn | Rialo Arena");
for (const source of phaseCopy) assert.ok(keys.has(source), `Cinematic copy bypasses t(): ${source}`);
const allKeys = new Set([...keys, ...literalKeys]);
for (const file of fs.readdirSync(path.join(root, "src/lib/i18n/messages")).filter((name) => name.endsWith(".json"))) {
  const dictionary = JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/messages", file), "utf8"));
  for (const key of allKeys) assert.ok(Object.hasOwn(dictionary, key), `${file}: missing rendered/animated Learn message ${key}`);
}
if (process.argv.includes("--inventory")) console.log(JSON.stringify([...allKeys].sort(), null, 2));
else console.log(`Learn i18n checks passed: ${files.length} TSX files, ${calls} t() calls, ${keys.size} keys exercised + ${allKeys.size - keys.size} animation-only keys inventoried; EN/RTL render parity, 8 stable chapters, SVG labels and example data verified.`);
