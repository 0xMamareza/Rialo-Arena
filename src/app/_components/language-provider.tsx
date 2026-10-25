"use client";

import { createContext, useCallback, useContext, useMemo, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { getDirection, getLocaleCookie, getTranslator, normalizeLocale, type Dictionary, type Locale } from "@/lib/i18n/core";

type I18nContextValue = {
  locale: Locale;
  t: ReturnType<typeof getTranslator>;
  direction: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  isPending: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children, locale, dictionary }: {
  children: ReactNode;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const setLocale = useCallback((value: Locale) => {
    const nextLocale = normalizeLocale(value);
    if (nextLocale === locale) return;
    document.cookie = getLocaleCookie(nextLocale, window.location.protocol);
    // Refresh merges new server props without replacing the active quiz subtree.
    startTransition(() => router.refresh());
  }, [locale, router]);
  const context = useMemo(() => ({
    locale,
    t: getTranslator(locale, dictionary),
    direction: getDirection(locale),
    setLocale,
    isPending,
  }), [locale, dictionary, setLocale, isPending]);

  return <I18nContext.Provider value={context}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LanguageProvider");
  return context;
}
