import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { loadDictionary } from "./catalog";
import { getDirection, getTranslator, LOCALE_COOKIE, normalizeLocale } from "./core";

export const getI18n = cache(async () => {
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const dictionary = await loadDictionary(locale);
  return { locale, dictionary, direction: getDirection(locale), t: getTranslator(locale, dictionary) };
});
