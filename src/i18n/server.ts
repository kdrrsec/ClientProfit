import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getSession } from "@/server/auth/context";
import { db } from "@/server/db";
import { isLocale, LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from "./config";
import { en } from "./messages/en";
import { nl } from "./messages/nl";
import { createT, translateMessage, type T } from "./translate";

export const MESSAGES = { en, nl } as const;

/** Signed-in user's saved choice, then the language cookie, then the browser's Accept-Language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const session = await getSession();
  if (session) {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { locale: true } });
    if (isLocale(user?.locale)) return user.locale;
  }
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
});

export const getI18n = cache(async (): Promise<{ locale: Locale; t: T; tm: (value: string) => string }> => {
  const locale = await getLocale();
  const t = createT(MESSAGES[locale]);
  return { locale, t, tm: (v: string) => translateMessage(MESSAGES[locale], t, v) };
});
