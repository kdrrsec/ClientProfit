import { utcDate } from "@/lib/profitability";

/**
 * "Today" as a calendar date in the organization's timezone, returned as UTC
 * midnight — the convention used for all DATE columns and the engine.
 */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return utcDate(get("year"), get("month") - 1, get("day"));
}
