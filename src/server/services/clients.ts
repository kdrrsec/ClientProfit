import "server-only";
import type Decimal from "decimal.js";
import { collectAttentionItems, type AttentionItem } from "@/lib/attention";
import {
  calculateMonthlyTimeline,
  isRecurring,
  isWithin,
  summarizeBySource,
  toMonthly,
  toYearly,
  type ClientProfitability,
  type FinancialLine,
  type MarginStatus,
  type SourceSummary,
} from "@/lib/profitability";
import { collectRenewals, type RenewalItem } from "@/lib/renewals";
import type { ClientStatus } from "@/generated/prisma/client";
import type { OrgContext } from "@/server/auth/context";
import { getClientWithFinancials, listClientsWithFinancials } from "@/server/repositories/clients";
import { toChartPoints, type TimelinePoint } from "./dashboard";
import { calculateForClient, getFinancialSettings, TIMELINE_MONTHS, type FinancialSettings } from "./profitability";

// ─── List ────────────────────────────────────────────────────────────────────

export const CLIENT_SORTS = ["profit", "revenue", "costs", "margin", "name"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];
export const CLIENT_PAGE_SIZE = 25;

export interface ClientListQuery {
  search?: string;
  status?: ClientStatus;
  archived?: boolean;
  sort: ClientSort;
  direction: "asc" | "desc";
  page: number;
}

export interface ClientListRow {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  status: ClientStatus;
  archived: boolean;
  revenue: Decimal;
  costs: Decimal;
  profit: Decimal;
  margin: Decimal | null;
  marginStatus: MarginStatus;
}

/**
 * Search and status filtering run in the database; sorting by financial
 * figures needs the engine, so sorting and pagination happen after
 * calculation. Fine for agency-sized client lists (hundreds, not millions).
 */
export async function listClients(ctx: OrgContext, q: ClientListQuery) {
  const settings = await getFinancialSettings(ctx);
  const clients = await listClientsWithFinancials(ctx, {
    search: q.search,
    status: q.status,
    archived: q.archived,
    timeEntriesSince: settings.timeEntriesSince,
  });

  const rows: ClientListRow[] = clients.map((c) => {
    const p = calculateForClient(c, settings).profitability;
    return {
      id: c.id,
      name: c.companyName,
      contactName: c.contactName,
      email: c.email,
      status: c.status,
      archived: c.archivedAt !== null,
      revenue: p.monthly.revenue,
      costs: p.monthly.directCosts.plus(p.monthly.labour),
      profit: p.monthly.profit,
      margin: p.margin,
      marginStatus: p.status,
    };
  });

  const sign = q.direction === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    let cmp: number;
    if (q.sort === "name") cmp = a.name.localeCompare(b.name);
    else if (q.sort === "margin") {
      // Clients without revenue (no margin) always sort last.
      if (a.margin === null || b.margin === null) return a.margin === b.margin ? a.name.localeCompare(b.name) : a.margin === null ? 1 : -1;
      cmp = a.margin.comparedTo(b.margin);
    } else cmp = a[q.sort].comparedTo(b[q.sort]);
    return cmp * sign || a.name.localeCompare(b.name);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / CLIENT_PAGE_SIZE));
  const page = Math.min(Math.max(1, q.page), pageCount);
  return {
    currency: settings.currency,
    rows: rows.slice((page - 1) * CLIENT_PAGE_SIZE, page * CLIENT_PAGE_SIZE),
    total,
    page,
    pageCount,
  };
}

// ─── Detail ──────────────────────────────────────────────────────────────────

export interface LineView {
  line: FinancialLine;
  /** Recurring equivalents; zero for one-time lines. */
  monthly: Decimal;
  yearly: Decimal;
  state: "active" | "upcoming" | "one-time" | "ended";
}

const STATE_ORDER: Record<LineView["state"], number> = { active: 0, upcoming: 1, "one-time": 2, ended: 3 };

function toLineView(line: FinancialLine, today: Date): LineView {
  let state: LineView["state"];
  if (!isRecurring(line.interval)) state = "one-time";
  else if (today < line.startDate) state = "upcoming";
  else state = isWithin(today, line.startDate, line.endDate) ? "active" : "ended";
  return { line, monthly: toMonthly(line.amount, line.interval), yearly: toYearly(line.amount, line.interval), state };
}

export interface ClientDetail {
  settings: FinancialSettings;
  client: Awaited<ReturnType<typeof getClientWithFinancials>>;
  profitability: ClientProfitability;
  revenueLines: LineView[];
  costLines: LineView[];
  /** Run-rate figures per service/domain/hosting/cost id. */
  bySource: Map<string, SourceSummary>;
  renewals: RenewalItem[];
  attention: AttentionItem[];
  timeline: TimelinePoint[];
}

export async function getClientDetail(ctx: OrgContext, clientId: string): Promise<ClientDetail> {
  const [settings, client] = await Promise.all([getFinancialSettings(ctx), getClientWithFinancials(ctx, clientId)]);
  const { lines, labour, profitability } = calculateForClient(client, settings);
  const renewals = collectRenewals([client], settings.today, { horizonDays: 90 });

  const views = lines.map((l) => toLineView(l, settings.today));
  const byStateThenAmount = (a: LineView, b: LineView) =>
    STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
    b.yearly.comparedTo(a.yearly) ||
    b.line.amount.comparedTo(a.line.amount) ||
    a.line.label.localeCompare(b.line.label);

  return {
    settings,
    client,
    profitability,
    revenueLines: views.filter((v) => v.line.kind === "REVENUE").sort(byStateThenAmount),
    costLines: views.filter((v) => v.line.kind === "DIRECT_COST").sort(byStateThenAmount),
    bySource: summarizeBySource(lines, settings.today),
    renewals,
    attention: collectAttentionItems([{ ...client, profitability }], renewals, { today: settings.today }),
    timeline: toChartPoints(
      calculateMonthlyTimeline(
        lines,
        labour,
        { year: settings.timelineStart.getUTCFullYear(), month: settings.timelineStart.getUTCMonth() + 1 },
        TIMELINE_MONTHS,
      ),
    ),
  };
}
