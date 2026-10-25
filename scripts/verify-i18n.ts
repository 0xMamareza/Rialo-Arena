import assert from "node:assert/strict";

async function main() {
  const { locales, normalizeLocale, getDirection } = await import("../src/lib/i18n/core");
  assert.deepEqual(locales.map(({ code }: { code: string }) => code), [
    "en", "zh-CN", "ko", "vi", "ru", "uk", "id", "hi", "tr", "th", "pt-BR", "ur", "bn", "ar", "fa",
  ]);
  for (const { code, label } of locales) {
    assert.equal(normalizeLocale(code), code);
    assert.ok(label.length > 1);
    assert.equal(getDirection(code), ["ur", "ar", "fa"].includes(code) ? "rtl" : "ltr");
  }
  for (const untrusted of [undefined, null, "", "fr", "af", "../../fa", "fa; Secure", "%66%61", "FA", "zh-cn", " fa ", {}, ["fa"], "__proto__", "constructor"]) {
    assert.equal(normalizeLocale(untrusted), "en");
  }
  console.log("i18n: locale registry, trust boundary, and RTL passed");

  const { normalizeMessage, getTranslator } = await import("../src/lib/i18n/core");
  assert.equal(normalizeMessage("  Hello\n   {name}\u00a0!  "), "Hello {name} !");
  assert.equal(normalizeMessage("Cafe\u0301"), "Café");
  const dictionary = { "Hello {name}": "سلام {name}", "Score: {score}": "امتیاز: {score}", "Empty": "" };
  const t = getTranslator("fa", dictionary);
  assert.equal(t("  Hello\n{name}  ", { name: "Rialo" }), "سلام Rialo");
  assert.equal(t("Score: {score}", { score: 0 }), "امتیاز: 0");
  assert.equal(t("Missing {name}", { name: "English" }), "Missing English");
  assert.equal(t("Empty"), "Empty");
  assert.equal(t("Hello {name}"), "سلام {name}");
  assert.equal(t("constructor"), "constructor");
  assert.equal(t("__proto__"), "__proto__");
  assert.equal(getTranslator("en", dictionary)("Hello {name}", { name: "Rialo" }), "Hello Rialo");
  assert.equal(getTranslator("fa")("Keep  original\nspacing"), "Keep  original\nspacing");
  assert.equal(t("Value {missing}", Object.create({ missing: "unsafe" })), "Value {missing}");
  assert.equal(t("Hello {name}", { name: "$& <script>" }), "سلام $& <script>");
  console.log("i18n: normalization, translation, interpolation, and English fallback passed");

  const { LOCALE_COOKIE, getLocaleCookie } = await import("../src/lib/i18n/core");
  assert.equal(LOCALE_COOKIE, "rialo_locale");
  assert.equal(getLocaleCookie("fa", "http:"), "rialo_locale=fa; Path=/; Max-Age=31536000; SameSite=Lax");
  assert.equal(getLocaleCookie("pt-BR", "https:"), "rialo_locale=pt-BR; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
  assert.equal(getLocaleCookie("fa; injected=1", "http:"), "rialo_locale=en; Path=/; Max-Age=31536000; SameSite=Lax");
  console.log("i18n: explicit locale cookie persistence and HTTPS security passed");

  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { loadDictionary } = await import("../src/lib/i18n/catalog");
  const fixture = await mkdtemp(join(tmpdir(), "rialo-i18n-"));
  try {
    assert.deepEqual(await loadDictionary("fa", fixture), {});
    await writeFile(join(fixture, "fa.json"), JSON.stringify(dictionary));
    assert.deepEqual(await loadDictionary("fa", fixture), dictionary);
    assert.deepEqual(await loadDictionary("../../fa", fixture), {});
    await writeFile(join(fixture, "fa.json"), '{"ok":"درست","bad":7,"nested":{},"__proto__":"safe"}');
    const loaded = await loadDictionary("fa", fixture);
    assert.equal(loaded.ok, "درست");
    assert.ok(!Object.hasOwn(loaded, "bad"));
    assert.ok(!Object.hasOwn(loaded, "nested"));
    assert.equal(Object.getPrototypeOf(loaded), Object.prototype);
    await writeFile(join(fixture, "fa.json"), "not JSON");
    await assert.rejects(() => loadDictionary("fa", fixture), SyntaxError);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
  console.log("i18n: server catalog loading, missing catalog fallback, and catalog trust boundary passed");

  const { readFile } = await import("node:fs/promises");
  const source = (file: string) => readFile(join(process.cwd(), file), "utf8");
  const server = await source("src/lib/i18n/server.ts");
  assert.match(server, /await cookies\(\)/);
  assert.match(server, /loadDictionary\(locale\)/);
  const layout = await source("src/app/layout.tsx");
  assert.match(layout, /lang=\{locale\} dir=\{direction\}/);
  assert.match(layout, /<LanguageProvider/);
  assert.doesNotMatch(layout, /<LanguageSelector/, "The selector is integrated into page headers, not a global toolbar");
  assert.doesNotMatch(layout, /key=\{locale\}/);

  // Execute the layout's metadata with only its request-scoped i18n boundary stubbed.
  const { transpileModule, ModuleKind, JsxEmit, ScriptTarget } = await import("typescript");
  const { runInNewContext } = await import("node:vm");
  const metadataExports: { generateMetadata?: () => Promise<{ title: string; description: string }> } = {};
  let metadataLocale: "en" | "fa" = "en";
  runInNewContext(transpileModule(layout, {
    compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX, target: ScriptTarget.ES2022 },
  }).outputText, {
    exports: metadataExports,
    require: (specifier: string) => specifier === "@/lib/i18n/server" ? {
      getI18n: async () => ({ t: getTranslator(metadataLocale, await loadDictionary(metadataLocale)) }),
    } : {},
  });
  assert.equal(typeof metadataExports.generateMetadata, "function", "Home metadata must be generated for the request locale");
  const metadataDescription = "The competitive Rialo knowledge challenge: 15 questions, 20 seconds each, and up to 3,000 points.";
  for (const locale of ["en", "fa"] as const) {
    metadataLocale = locale;
    const expectedDescription = getTranslator(locale, await loadDictionary(locale))(metadataDescription);
    if (locale === "fa") assert.notEqual(expectedDescription, metadataDescription);
    const metadata = await metadataExports.generateMetadata!();
    assert.equal(metadata.title, "Rialo Arena");
    assert.equal(metadata.description, expectedDescription, `${locale} home metadata must use the translated description`);
  }
  console.log("i18n: request-localized English/Persian home metadata and unchanged brand title passed");

  const provider = await source("src/app/_components/language-provider.tsx");
  assert.match(provider, /router\.refresh\(\)/);
  assert.match(provider, /getTranslator\(locale, dictionary\)/);
  assert.match(provider, /document\.cookie = getLocaleCookie/);
  assert.doesNotMatch(provider, /window\.location\.(?:reload|assign)|location\.href|messages\//);
  const selector = await source("src/app/_components/language-selector.tsx");
  assert.match(selector, /<select/);
  assert.match(selector, /htmlFor=/);
  assert.match(selector, /lang=\{code\}/);
  const styles = await source("src/app/i18n.css");
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /text-transform: none/);
  assert.match(styles, /letter-spacing: normal/);
  assert.doesNotMatch(styles, /scaleX\(-1\)/);
  assert.ok(styles.includes(':not([class*="pressureWord"] *)'), "Preserve the animated Rialo wordmark font");
  assert.ok(styles.includes('[class*="choices"] button'), "Quiz answers must align to the RTL text start");
  console.log("i18n: server/client boundary, refresh-without-remount, accessible selector, and script style contracts passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
