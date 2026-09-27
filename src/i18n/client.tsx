"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages/en";
import { createT, translateMessage, type T } from "./translate";

const I18nContext = createContext<{ locale: Locale; t: T; tm: (value: string) => string } | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const value = useMemo(() => {
    const t = createT(messages);
    return { locale, t, tm: (v: string) => translateMessage(messages, t, v) };
  }, [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
