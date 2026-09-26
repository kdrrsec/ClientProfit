import "server-only";
import type Decimal from "decimal.js";
import type { ClientStatus } from "@/generated/prisma/client";
import { calculateMargin, sum, summarizePortfolio, type MarginStatus } from "@/lib/profitability";
import type { OrgContext } from "@/server/auth/context";
import { listClientsWithFinancials } from "@/server/repositories/clients";
import { calculateForClient, getFinancialSettings } from "./profitability";

export const PROFIT_VIEWS = ["all", "active", "negative", "low"] as const;
export type ProfitView = (typeof PROFIT_VIEWS)[number];

export const PROFIT_SORTS = ["name", "mrr", "costs", "labour", "hours", "profit", "margin", "annualRevenue", "annualProfit", "contribution"] as const;
export type ProfitSort = (typeof PROFIT_SORTS)[number];

export const PROFIT_PAGE_SIZE = 25;

export interface ProfitRow {
  id: string;
  name: string;
  status: ClientStatus;
  mrr: Decimal;
  costs: Decimal;
  labour: Decimal;
  hours: Decimal;
  profit: Decimal;
  margin: Decimal | null;
  marginStatus: MarginStatus;
  annualRevenue: Decimal;
  annualProfit: Decimal;
  /** Share of the company's total monthly profit, in percent. Null when company profit is zero. */
  contribution: Decimal | null;
}

export interface ProfitQuery {
  search?: string;
  view: ProfitView;
  sort: ProfitSort;
  direction: "asc" | "desc";
  page: number;
}

function totalsOf(rows: ProfitRow[]) {
  const mrr = sum(rows.map((r) => r.mrr));
  const profit = sum(rows.map((r) => r.profit));
  return {
    mrr,
    costs: sum(rows.map((r) => r.costs)),
    labour: sum(rows.map((r) => r.labour)),
    hours: sum(rows.map((r) => r.hours)),
    profit,
    margin: calculateMargin(profit, mrr),
    annualRevenue: sum(rows.map((r) => r.annualRevenue)),
    annualProfit: sum(rows.map((r) => r.annualProfit)),
  };
}
export type ProfitTotals = ReturnType<typeof totalsOf>;

/**
 * Company-wide profitability per client. Company totals always cover all
 * non-archived clients; the selection totals cover the filtered rows.
 */
export async function getProfitabilityTable(ctx: OrgContext, q: ProfitQuery) {
  const settings = await getFinancialSettings(ctx);
  const clients = await listClientsWithFinancials(ctx, { timeEntriesSince: settings.timeEntriesSince });
  const calculated = clients.map((c) => ({ client: c, p: calculateForClient(c, settings).profitability }));
  const portfolio = summarizePortfolio(calculated.map(({ client, p }) => ({ clientId: client.id, profitability: p })));

  const all: ProfitRow[] = calculated.map(({ client, p }) => ({
    id: client.id,
    name: client.companyName,
    status: client.status,
    mrr: p.monthly.revenue,
    costs: p.monthly.directCosts,
    labour: p.monthly.labour,
    hours: p.monthlyHours,
    profit: p.monthly.profit,
    margin: p.margin,
    marginStatus: p.status,
    annualRevenue: p.annual.revenue,
    annualProfit: p.annual.profit,
    contribution: portfolio.profitContribution.get(client.id) ?? null,
  }));

  const search = q.search?.toLowerCase();
  const rows = all.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search)) return false;
    if (q.view === "active") return r.status === "ACTIVE";
    if (q.view === "negative") return r.marginStatus === "NEGATIVE";
    if (q.view === "low") return r.marginStatus === "LOW";
    return true;
  });

  const sign = q.direction === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    if (q.sort === "name") return a.name.localeCompare(b.name) * sign;
    const x = a[q.sort];
    const y = b[q.sort];
    // Rows without a value (no margin / no contribution) always sort last.
    if (x === null || y === null) return x === y ? a.name.localeCompare(b.name) : x === null ? 1 : -1;
    return x.comparedTo(y) * sign || a.name.localeCompare(b.name);
  });

  const pageCount = Math.max(1, Math.ceil(rows.length / PROFIT_PAGE_SIZE));
  const page = Math.min(Math.max(1, q.page), pageCount);
  return {
    currency: settings.currency,
    labourWindowMonths: settings.labourWindowMonths,
    thresholds: settings.thresholds,
    company: totalsOf(all),
    selection: totalsOf(rows),
    counts: {
      all: all.length,
      active: all.filter((r) => r.status === "ACTIVE").length,
      negative: all.filter((r) => r.marginStatus === "NEGATIVE").length,
      low: all.filter((r) => r.marginStatus === "LOW").length,
    },
    rows: rows.slice((page - 1) * PROFIT_PAGE_SIZE, page * PROFIT_PAGE_SIZE),
    total: rows.length,
    page,
    pageCount,
  };
}
