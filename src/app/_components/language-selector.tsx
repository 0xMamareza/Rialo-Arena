"use client";

import { useId } from "react";
import { getDirection, locales, normalizeLocale } from "@/lib/i18n/core";
import { useI18n } from "./language-provider";

export function LanguageSelector() {
  const { locale, t, setLocale, isPending } = useI18n();
  const id = useId();

  return (
    <div className="language-selector" aria-busy={isPending}>
      <label htmlFor={id}>{t("Language")}</label>
      <select
        id={id}
        data-language-selector
        value={locale}
        disabled={isPending}
        onChange={(event) => setLocale(normalizeLocale(event.target.value))}
      >
        {locales.map(({ code, label }) => (
          <option key={code} value={code} lang={code} dir={getDirection(code)}>{label}</option>
        ))}
      </select>
    </div>
  );
}
