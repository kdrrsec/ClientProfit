/**
 * Calendar-date helpers. All engine dates are treated as UTC calendar days
 * (Postgres DATE columns arrive as UTC midnight). Callers convert "today in
 * the organization's timezone" to a UTC-midnight Date before calling in.
 */
const MS_PER_DAY = 86_400_000;

export function dayNumber(date: Date): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

export function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function startOfDay(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(startOfDay(date).getTime() + days * MS_PER_DAY);
}

/** Adds calendar months, clamping to the last day of the target month (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const target = utcDate(y, m, 1);
  const lastDay = daysInMonth(target.getUTCFullYear(), target.getUTCMonth());
  return utcDate(target.getUTCFullYear(), target.getUTCMonth(), Math.min(date.getUTCDate(), lastDay));
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Inclusive day count between two dates (same day = 1). Returns 0 if end < start. */
export function daysInclusive(start: Date, end: Date): number {
  return Math.max(0, dayNumber(end) - dayNumber(start) + 1);
}

export function isWithin(date: Date, start: Date, end: Date | null): boolean {
  const d = dayNumber(date);
  return d >= dayNumber(start) && (end === null || d <= dayNumber(end));
}
