import { addMonths, addDays, dayNumber, daysInclusive, isWithin } from "./dates";
import { isRecurring, toYearly } from "./intervals";
import type { FinancialLine, LabourEntry, LineKind } from "./lines";
import { Money, ZERO, sum, type Money as MoneyT } from "./money";

/**
 * Run-rate calculations: "what does this client look like per month/year,
 * right now?" Only recurring lines active on `asOf` count. One-time amounts
 * are excluded here and handled by the period/timeline calculations.
 */

const AVG_DAYS_PER_MONTH = new Money(365.25).dividedBy(12);

function activeRecurring(lines: FinancialLine[], kind: LineKind, asOf: Date): FinancialLine[] {
  return lines.filter((l) => l.kind === kind && isRecurring(l.interval) && isWithin(asOf, l.startDate, l.endDate));
}

function annual(lines: FinancialLine[], kind: LineKind, asOf: Date): MoneyT {
  return sum(activeRecurring(lines, kind, asOf).map((l) => toYearly(l.amount, l.interval)));
}

export function calculateAnnualRevenue(lines: FinancialLine[], asOf: Date): MoneyT {
  return annual(lines, "REVENUE", asOf);
}

export function calculateAnnualCosts(lines: FinancialLine[], asOf: Date): MoneyT {
  return annual(lines, "DIRECT_COST", asOf);
}

/** MRR contribution: yearly equivalent / 12 of active recurring revenue. */
export function calculateMonthlyRevenue(lines: FinancialLine[], asOf: Date): MoneyT {
  return calculateAnnualRevenue(lines, asOf).dividedBy(12);
}

export function calculateMonthlyCosts(lines: FinancialLine[], asOf: Date): MoneyT {
  return calculateAnnualCosts(lines, asOf).dividedBy(12);
}

export function labourCost(entry: LabourEntry): MoneyT {
  return entry.hours.times(entry.hourlyCost);
}

export interface LabourWindowOptions {
  /** Trailing window length in months (default 3). */
  windowMonths?: number;
  /** When the client relationship started; shortens the window for new clients. */
  activeSince?: Date | null;
}

export interface LabourWindow {
  from: Date;
  to: Date;
  months: MoneyT;
  hours: MoneyT;
  cost: MoneyT;
}

/**
 * Labour is not a subscription, so its monthly figure is a trailing average:
 * labour cost logged in (asOf − windowMonths, asOf] divided by the number of
 * months in that window. For clients (or first entries) younger than the
 * window, the window starts at the later of those dates, with a minimum of
 * one month, so a brand-new client isn't under-costed by averaging over
 * months in which it didn't exist.
 */
export function calculateLabourWindow(entries: LabourEntry[], asOf: Date, opts: LabourWindowOptions = {}): LabourWindow {
  const windowMonths = opts.windowMonths ?? 3;
  const windowStart = addDays(addMonths(asOf, -windowMonths), 1);
  const inWindow = entries.filter((e) => isWithin(e.date, windowStart, asOf));

  // Only the client's start date may shorten the window. Entry dates alone
  // must not: an established client logging on the 10th of each month would
  // otherwise be averaged over too few months and look more expensive.
  let effectiveStart = windowStart;
  if (opts.activeSince) {
    const earliest = inWindow.reduce(
      (acc, e) => (dayNumber(e.date) < dayNumber(acc) ? e.date : acc),
      opts.activeSince,
    );
    if (dayNumber(earliest) > dayNumber(windowStart)) effectiveStart = earliest;
  }

  const months =
    effectiveStart === windowStart
      ? new Money(windowMonths)
      : Money.max(1, Money.min(windowMonths, new Money(daysInclusive(effectiveStart, asOf)).dividedBy(AVG_DAYS_PER_MONTH)));

  return {
    from: effectiveStart,
    to: asOf,
    months,
    hours: sum(inWindow.map((e) => e.hours)),
    cost: sum(inWindow.map(labourCost)),
  };
}

export function calculateMonthlyLabour(entries: LabourEntry[], asOf: Date, opts: LabourWindowOptions = {}): MoneyT {
  const w = calculateLabourWindow(entries, asOf, opts);
  return w.cost.isZero() ? ZERO : w.cost.dividedBy(w.months);
}

/** Gross profit = revenue − direct costs − labour. */
export function calculateProfit(input: { revenue: MoneyT; directCosts: MoneyT; labour: MoneyT }): MoneyT {
  return input.revenue.minus(input.directCosts).minus(input.labour);
}

export function calculateMonthlyProfit(lines: FinancialLine[], labour: LabourEntry[], asOf: Date, opts: LabourWindowOptions = {}): MoneyT {
  return calculateProfit({
    revenue: calculateMonthlyRevenue(lines, asOf),
    directCosts: calculateMonthlyCosts(lines, asOf),
    labour: calculateMonthlyLabour(labour, asOf, opts),
  });
}

/** Computed from yearly equivalents directly so quarterly/yearly amounts stay exact. */
export function calculateAnnualProfit(lines: FinancialLine[], labour: LabourEntry[], asOf: Date, opts: LabourWindowOptions = {}): MoneyT {
  return calculateProfit({
    revenue: calculateAnnualRevenue(lines, asOf),
    directCosts: calculateAnnualCosts(lines, asOf),
    labour: calculateMonthlyLabour(labour, asOf, opts).times(12),
  });
}

/** Margin in percent (profit / revenue × 100). Null when there is no revenue: a margin is undefined, not 0. */
export function calculateMargin(profit: MoneyT, revenue: MoneyT): MoneyT | null {
  if (revenue.isZero()) return null;
  return profit.dividedBy(revenue).times(100);
}
