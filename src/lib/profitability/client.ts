import { isWithin } from "./dates";
import { isRecurring } from "./intervals";
import { buildClientLines, type ClientSources, type FinancialLine, type LabourEntry } from "./lines";
import { ZERO, type Money } from "./money";
import {
  calculateAnnualCosts,
  calculateAnnualRevenue,
  calculateLabourWindow,
  calculateMargin,
  calculateProfit,
  type LabourWindowOptions,
} from "./recurring";
import { DEFAULT_THRESHOLDS, getMarginStatus, type MarginStatus, type MarginThresholds } from "./status";

export interface ProfitabilityOptions extends LabourWindowOptions {
  asOf: Date;
  thresholds?: MarginThresholds;
}

export interface ClientProfitability {
  monthly: { revenue: Money; directCosts: Money; labour: Money; profit: Money };
  annual: { revenue: Money; directCosts: Money; labour: Money; profit: Money };
  /** Percent, or null when there is no recurring revenue. */
  margin: Money | null;
  status: MarginStatus;
  labourWindow: { hours: Money; cost: Money; months: Money; from: Date; to: Date };
  recurringRevenueLines: number;
}

/** All figures unrounded; round only when presenting. */
export function calculateLineProfitability(
  lines: FinancialLine[],
  labour: LabourEntry[],
  opts: ProfitabilityOptions,
): ClientProfitability {
  const { asOf } = opts;
  const annualRevenue = calculateAnnualRevenue(lines, asOf);
  const annualCosts = calculateAnnualCosts(lines, asOf);
  const window = calculateLabourWindow(labour, asOf, opts);
  const monthlyLabour = window.cost.isZero() ? ZERO : window.cost.dividedBy(window.months);
  const annualLabour = monthlyLabour.times(12);

  const annualProfit = calculateProfit({ revenue: annualRevenue, directCosts: annualCosts, labour: annualLabour });
  const monthly = {
    revenue: annualRevenue.dividedBy(12),
    directCosts: annualCosts.dividedBy(12),
    labour: monthlyLabour,
    profit: annualProfit.dividedBy(12),
  };
  const margin = calculateMargin(annualProfit, annualRevenue);

  return {
    monthly,
    annual: { revenue: annualRevenue, directCosts: annualCosts, labour: annualLabour, profit: annualProfit },
    margin,
    status: getMarginStatus(margin, opts.thresholds ?? DEFAULT_THRESHOLDS),
    labourWindow: window,
    recurringRevenueLines: lines.filter(
      (l) => l.kind === "REVENUE" && isRecurring(l.interval) && isWithin(asOf, l.startDate, l.endDate),
    ).length,
  };
}

export function calculateClientProfitability(sources: ClientSources, opts: ProfitabilityOptions): ClientProfitability {
  const { lines, labour } = buildClientLines(sources);
  return calculateLineProfitability(lines, labour, opts);
}
