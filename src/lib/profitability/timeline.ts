import { daysInMonth, daysInclusive, dayNumber, utcDate } from "./dates";
import { toYearly } from "./intervals";
import type { FinancialLine, LabourEntry } from "./lines";
import { Money, ZERO, type Money as MoneyT } from "./money";
import { labourCost } from "./recurring";

export interface MonthPoint {
  /** "YYYY-MM" */
  month: string;
  revenue: MoneyT;
  directCosts: MoneyT;
  labour: MoneyT;
  profit: MoneyT;
}

/**
 * Month-by-month figures derived from line dates (not from invoices):
 * - recurring lines: monthly equivalent, prorated by active days in the month
 * - one-time lines: full amount in the month of startDate
 * - labour: actual time entries in that month
 */
export function calculateMonthlyTimeline(
  lines: FinancialLine[],
  labour: LabourEntry[],
  from: { year: number; month: number },
  count: number,
): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let i = 0; i < count; i++) {
    const monthStart = utcDate(from.year, from.month - 1 + i, 1);
    const y = monthStart.getUTCFullYear();
    const m = monthStart.getUTCMonth();
    const dim = daysInMonth(y, m);
    const monthEnd = utcDate(y, m, dim);

    let revenue = ZERO;
    let directCosts = ZERO;
    for (const line of lines) {
      const amount = lineAmountInMonth(line, monthStart, monthEnd, dim);
      if (amount.isZero()) continue;
      if (line.kind === "REVENUE") revenue = revenue.plus(amount);
      else directCosts = directCosts.plus(amount);
    }

    let labourTotal = ZERO;
    for (const e of labour) {
      const d = dayNumber(e.date);
      if (d >= dayNumber(monthStart) && d <= dayNumber(monthEnd)) labourTotal = labourTotal.plus(labourCost(e));
    }

    points.push({
      month: `${y}-${String(m + 1).padStart(2, "0")}`,
      revenue,
      directCosts,
      labour: labourTotal,
      profit: revenue.minus(directCosts).minus(labourTotal),
    });
  }
  return points;
}

function lineAmountInMonth(line: FinancialLine, monthStart: Date, monthEnd: Date, dim: number): MoneyT {
  if (line.interval === "ONE_TIME") {
    const d = dayNumber(line.startDate);
    return d >= dayNumber(monthStart) && d <= dayNumber(monthEnd) ? line.amount : ZERO;
  }
  const start = dayNumber(line.startDate) > dayNumber(monthStart) ? line.startDate : monthStart;
  const end = line.endDate !== null && dayNumber(line.endDate) < dayNumber(monthEnd) ? line.endDate : monthEnd;
  const activeDays = daysInclusive(start, end);
  if (activeDays === 0) return ZERO;
  return toYearly(line.amount, line.interval).dividedBy(12).times(activeDays).dividedBy(new Money(dim));
}
