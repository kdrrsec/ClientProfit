import "server-only";
import type Decimal from "decimal.js";
import { collectAttentionItems, type AttentionItem } from "@/lib/attention";
import {
  addMonths,
  buildClientLines,
  calculateLineProfitability,
  calculateMonthlyTimeline,
  roundMoney,
  summarizePortfolio,
  type ClientProfitability,
  type FinancialLine,
  type LabourEntry,
  type MarginStatus,
} from "@/lib/profitability";
import { collectRenewals, type RenewalItem } from "@/lib/renewals";
import { todayInTimeZone } from "@/lib/time";
import type { ClientStatus } from "@/generated/prisma/client";
import type { OrgContext } from "@/server/auth/context";
import { listClientsWithFinancials } from "@/server/repositories/clients";
import { getOrganization } from "@/server/repositories/organizations";

const TIMELINE_MONTHS = 12;

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
  const org = await getOrganization(ctx);
  const today = todayInTimeZone(org.timezone);
  const timelineStart = addMonths(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), -(TIMELINE_MONTHS - 1));
  const labourStart = addMonths(today, -org.labourWindowMonths);
  const since = timelineStart < labourStart ? timelineStart : labourStart;

  const clients = await listClientsWithFinancials(ctx, { timeEntriesSince: since });
  const thresholds = { low: org.lowMarginThreshold, negative: org.negativeMarginThreshold };

  const allLines: FinancialLine[] = [];
  const allLabour: LabourEntry[] = [];
  const perClient = clients.map((c) => {
    const { lines, labour } = buildClientLines(c);
    allLines.push(...lines);
    allLabour.push(...labour);
    const profitability: ClientProfitability = calculateLineProfitability(lines, labour, {
      asOf: today,
      windowMonths: org.labourWindowMonths,
      activeSince: c.startDate,
      thresholds,
    });
    return { client: c, profitability };
  });

  const portfolio = summarizePortfolio(perClient.map((p) => ({ clientId: p.client.id, profitability: p.profitability })));

  const rows: ClientProfitRow[] = perClient
    .map(({ client, profitability: p }) => ({
      id: client.id,
      name: client.companyName,
      clientStatus: client.status,
      revenue: p.monthly.revenue,
      costs: p.monthly.directCosts.plus(p.monthly.labour),
      profit: p.monthly.profit,
      margin: p.margin,
      marginStatus: p.status,
    }))
    .sort((a, b) => b.profit.comparedTo(a.profit) || a.name.localeCompare(b.name));

  const timeline = calculateMonthlyTimeline(
    allLines,
    allLabour,
    { year: timelineStart.getUTCFullYear(), month: timelineStart.getUTCMonth() + 1 },
    TIMELINE_MONTHS,
  ).map((pt) => ({
    month: pt.month,
    // Chart values only: rounded to cents before leaving Decimal-land.
    revenue: Number(roundMoney(pt.revenue).toFixed(2)),
    costs: Number(roundMoney(pt.directCosts.plus(pt.labour)).toFixed(2)),
  }));

  const renewals = collectRenewals(clients, today, { horizonDays: 90 });
  const attention = collectAttentionItems(
    perClient.map(({ client, profitability }) => ({ ...client, profitability })),
    renewals,
    { today },
  );

  const monthlyCosts = portfolio.monthlyDirectCosts.plus(portfolio.monthlyLabour);
  return {
    currency: org.currency,
    today,
    kpis: {
      mrr: portfolio.mrr,
      arr: portfolio.arr,
      monthlyCosts,
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
    labourWindowMonths: org.labourWindowMonths,
  };
}
