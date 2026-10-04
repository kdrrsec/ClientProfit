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

/**
 * The language cookie (the latest choice on this device), then the signed-in
 * user's saved choice (so it follows them to a new device), then the
 * browser's Accept-Language.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const session = await getSession();
  if (session) {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { locale: true } });
    if (isLocale(user?.locale)) return user.locale;
  }
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
});

export const getI18n = cache(async (): Promise<{ locale: Locale; t: T; tm: (value: string) => string }> => {
  const locale = await getLocale();
  const t = createT(MESSAGES[locale]);
  return { locale, t, tm: (v: string) => translateMessage(MESSAGES[locale], t, v) };
});
