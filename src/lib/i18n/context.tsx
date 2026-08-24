"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  dictionaries,
  DEFAULT_LOCALE,
  type Locale,
} from "@/lib/i18n/dictionaries";

type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

/**
 * Maps an app locale to the BCP 47 tag Intl expects. This ternary used to be
 * copy pasted into roughly a dozen components, so a new locale meant hunting
 * every copy.
 */
const BCP47: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  zh: "zh-CN",
};

interface I18nContextValue {
  locale: Locale;
  /** BCP 47 tag for Intl date and number formatting. */
  bcp47: string;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  bcp47: BCP47[DEFAULT_LOCALE],
  t: (key) => key,
});

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
    const t: TranslateFn = (key, vars) => {
      let value = dict[key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.split(`{${k}}`).join(String(v));
        }
      }
      return value;
    };
    return { locale, bcp47: BCP47[locale] ?? BCP47.en, t };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
