export const locales = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Українська" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "hi", label: "हिन्दी" },
  { code: "tr", label: "Türkçe" },
  { code: "th", label: "ไทย" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "ur", label: "اردو" },
  { code: "bn", label: "বাংলা" },
  { code: "ar", label: "العربية" },
  { code: "fa", label: "فارسی" },
] as const;

export type Locale = (typeof locales)[number]["code"];
export type Dictionary = Readonly<Record<string, string>>;
export type TranslationValues = Record<string, string | number>;

export function normalizeMessage(source: string): string {
  return source.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export function getTranslator(locale: Locale, dictionary: Dictionary = {}) {
  return (source: string, values: TranslationValues = {}): string => {
    const key = normalizeMessage(source);
    const translation = locale !== "en" && Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
    const message = typeof translation === "string" && translation.trim() ? translation : source;
    return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      Object.hasOwn(values, name) ? String(values[name]) : placeholder,
    );
  };
}

export const LOCALE_COOKIE = "rialo_locale";

export function getLocaleCookie(value: unknown, protocol: string): string {
  return `${LOCALE_COOKIE}=${normalizeLocale(value)}; Path=/; Max-Age=31536000; SameSite=Lax${protocol === "https:" ? "; Secure" : ""}`;
}

export function normalizeLocale(value: unknown): Locale {
  return locales.find(({ code }) => code === value)?.code ?? "en";
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" || locale === "fa" || locale === "ur" ? "rtl" : "ltr";
}
