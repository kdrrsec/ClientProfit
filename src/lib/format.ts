import type Decimal from "decimal.js";
import { DATE_LOCALE, type Locale } from "@/i18n/config";
import type { T } from "@/i18n/translate";
import { roundMoney, roundPercent } from "@/lib/profitability";

/** Amounts use European notation (€ 1.234,56) in every UI language. */
const LOCALE = "nl-NL";

const moneyFormatters = new Map<string, Intl.NumberFormat>();
function moneyFormatter(currency: string, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    moneyFormatters.set(key, f);
  }
  return f;
}

/**
 * Presentation-only. Rounds the Decimal to cents first, then formats; the
 * Number conversion happens after rounding so no float error can surface.
 */
export function formatMoney(value: Decimal, currency: string, opts: { whole?: boolean } = {}): string {
  const digits = opts.whole ? 0 : 2;
  const rounded = opts.whole ? value.toDecimalPlaces(0) : roundMoney(value);
  return moneyFormatter(currency, digits).format(Number(rounded.toFixed(digits)));
}

export function formatPercent(value: Decimal | null): string {
  if (value === null) return "—";
  return `${roundPercent(value).toFixed(1).replace(".", ",")}%`;
}

const dateFormatters = new Map<Locale, Intl.DateTimeFormat>();
export function formatDate(date: Date, locale: Locale): string {
  let f = dateFormatters.get(locale);
  if (!f) {
    f = new Intl.DateTimeFormat(DATE_LOCALE[locale], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    dateFormatters.set(locale, f);
  }
  return f.format(date);
}

export function formatRelativeDays(days: number, t: T): string {
  if (days === 0) return t("time.today");
  if (days === 1) return t("time.tomorrow");
  if (days === -1) return t("time.yesterday");
  return days > 0 ? t("time.inDays", { n: days }) : t("time.daysOverdue", { n: -days });
}

export function formatHours(hours: { toFixed(n: number): string }, digits = 2): string {
  return hours.toFixed(digits).replace(".", ",");
}
