import "server-only";
import type Decimal from "decimal.js";
import { collectAttentionItems, type AttentionItem } from "@/lib/attention";
import {
  calculateMonthlyTimeline,
  roundMoney,
  summarizePortfolio,
  type ClientProfitability,
  type FinancialLine,
  type LabourEntry,
  type MarginStatus,
  type MonthPoint,
} from "@/lib/profitability";
import { collectRenewals, type RenewalItem } from "@/lib/renewals";
import type { ClientStatus } from "@/generated/prisma/client";
import type { OrgContext } from "@/server/auth/context";
import { listClientsWithFinancials } from "@/server/repositories/clients";
import { calculateForClient, getFinancialSettings, TIMELINE_MONTHS } from "./profitability";

export interface ClientProfitRow {
  id: string;
  name: string;
  clientStatus: ClientStatus;
  revenue: Decimal;
  costs: Decimal;
  profit: Decimal;
  margin: Decimal | null;
  marginStatus: MarginStatus;
}

export interface TimelinePoint {
  month: string;
  revenue: number;
  costs: number;
}

export interface DashboardData {
  currency: string;
  today: Date;
  kpis: {
    mrr: Decimal;
    arr: Decimal;
    monthlyCosts: Decimal;
    monthlyDirectCosts: Decimal;
    monthlyLabour: Decimal;
    grossProfit: Decimal;
    margin: Decimal | null;
    activeClients: number;
    recurringItems: number;
  };
  rows: ClientProfitRow[];
  timeline: TimelinePoint[];
  renewals: RenewalItem[];
  attention: AttentionItem[];
  labourWindowMonths: number;
}

export async function getDashboardData(ctx: OrgContext): Promise<DashboardData> {
  const settings = await getFinancialSettings(ctx);
  const { today, timelineStart } = settings;
  const clients = await listClientsWithFinancials(ctx, { timeEntriesSince: settings.timeEntriesSince });

  const allLines: FinancialLine[] = [];
  const allLabour: LabourEntry[] = [];
  const perClient = clients.map((client) => {
    const calc = calculateForClient(client, settings);
    allLines.push(...calc.lines);
    allLabour.push(...calc.labour);
    return { client, profitability: calc.profitability };
  });

  const portfolio = summarizePortfolio(perClient.map((p) => ({ clientId: p.client.id, profitability: p.profitability })));

  const rows: ClientProfitRow[] = perClient
    .map(({ client, profitability }) => toProfitRow(client, profitability))
    .sort((a, b) => b.profit.comparedTo(a.profit) || a.name.localeCompare(b.name));

  const timeline = toChartPoints(
    calculateMonthlyTimeline(
      allLines,
      allLabour,
      { year: timelineStart.getUTCFullYear(), month: timelineStart.getUTCMonth() + 1 },
      TIMELINE_MONTHS,
    ),
  );

  const renewals = collectRenewals(clients, today, { horizonDays: 90 });
  const attention = collectAttentionItems(
    perClient.map(({ client, profitability }) => ({ ...client, profitability })),
    renewals,
    { today },
  );

  return {
    currency: settings.currency,
    today,
    kpis: {
      mrr: portfolio.mrr,
      arr: portfolio.arr,
      monthlyCosts: portfolio.monthlyDirectCosts.plus(portfolio.monthlyLabour),
      monthlyDirectCosts: portfolio.monthlyDirectCosts,
      monthlyLabour: portfolio.monthlyLabour,
      grossProfit: portfolio.monthlyProfit,
      margin: portfolio.margin,
      activeClients: clients.filter((c) => c.status === "ACTIVE").length,
      recurringItems: perClient.reduce((n, p) => n + p.profitability.recurringRevenueLines, 0),
    },
    rows,
    timeline,
    renewals,
    attention,
    labourWindowMonths: settings.labourWindowMonths,
  };
}

export function toProfitRow(
  client: { id: string; companyName: string; status: ClientStatus },
  p: ClientProfitability,
): ClientProfitRow {
  return {
    id: client.id,
    name: client.companyName,
    clientStatus: client.status,
    revenue: p.monthly.revenue,
    costs: p.monthly.directCosts.plus(p.monthly.labour),
    profit: p.monthly.profit,
    margin: p.margin,
    marginStatus: p.status,
  };
}

/** Chart values only: rounded to cents before leaving Decimal-land. */
export function toChartPoints(points: MonthPoint[]): TimelinePoint[] {
  return points.map((pt) => ({
    month: pt.month,
    revenue: Number(roundMoney(pt.revenue).toFixed(2)),
    costs: Number(roundMoney(pt.directCosts.plus(pt.labour)).toFixed(2)),
  }));
}
