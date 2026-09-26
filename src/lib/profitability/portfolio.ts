import type { ClientProfitability } from "./client";
import { sum, type Money } from "./money";
import { calculateMargin } from "./recurring";

export interface PortfolioClient {
  clientId: string;
  profitability: ClientProfitability;
}

export interface PortfolioSummary {
  mrr: Money;
  arr: Money;
  monthlyDirectCosts: Money;
  monthlyLabour: Money;
  monthlyProfit: Money;
  annualProfit: Money;
  /** Company margin: total profit / total revenue. Weighted by revenue. */
  margin: Money | null;
  /** Unweighted mean of client margins (clients without revenue excluded). */
  averageClientMargin: Money | null;
  /** clientId → share of total monthly profit, in percent. Null when total profit is zero. */
  profitContribution: Map<string, Money | null>;
}

export function summarizePortfolio(clients: PortfolioClient[]): PortfolioSummary {
  const p = clients.map((c) => c.profitability);
  const arr = sum(p.map((c) => c.annual.revenue));
  const annualCosts = sum(p.map((c) => c.annual.directCosts));
  const annualLabour = sum(p.map((c) => c.annual.labour));
  const annualProfit = sum(p.map((c) => c.annual.profit));

  const margins = p.map((c) => c.margin).filter((m): m is Money => m !== null);
  const averageClientMargin = margins.length === 0 ? null : sum(margins).dividedBy(margins.length);

  const profitContribution = new Map<string, Money | null>();
  for (const c of clients) {
    profitContribution.set(
      c.clientId,
      annualProfit.isZero() ? null : c.profitability.annual.profit.dividedBy(annualProfit).times(100),
    );
  }

  return {
    mrr: arr.dividedBy(12),
    arr,
    monthlyDirectCosts: annualCosts.dividedBy(12),
    monthlyLabour: annualLabour.dividedBy(12),
    monthlyProfit: annualProfit.dividedBy(12),
    annualProfit,
    margin: arr.isZero() ? null : calculateMargin(annualProfit, arr),
    averageClientMargin,
    profitContribution,
  };
}

