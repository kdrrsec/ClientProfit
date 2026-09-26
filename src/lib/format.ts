import type Decimal from "decimal.js";
import { roundMoney, roundPercent } from "@/lib/profitability";

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

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days overdue`;
}
