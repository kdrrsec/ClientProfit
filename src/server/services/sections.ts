import "server-only";
import type { CostCategory, DomainStatus } from "@/generated/prisma/client";
import {
  addDays,
  calculateAnnualCosts,
  calculateAnnualRevenue,
  costToLines,
  dayNumber,
  domainToLines,
  hostingToLines,
  isWithin,
  labourCost,
  sum,
  summarizeBySource,
  timeEntryToLabour,
  type FinancialLine,
} from "@/lib/profitability";
import type { OrgContext } from "@/server/auth/context";
import * as repo from "@/server/repositories/sections";
import { getFinancialSettings } from "./profitability";

/** Run-rate totals for a set of engine lines (active recurring items on `today`). */
function totals(lines: FinancialLine[], today: Date) {
  const annualRevenue = calculateAnnualRevenue(lines, today);
  const annualCosts = calculateAnnualCosts(lines, today);
  return {
    annualRevenue,
    annualCosts,
    annualProfit: annualRevenue.minus(annualCosts),
    monthlyRevenue: annualRevenue.dividedBy(12),
    monthlyCosts: annualCosts.dividedBy(12),
    monthlyProfit: annualRevenue.minus(annualCosts).dividedBy(12),
  };
}

async function base(ctx: OrgContext) {
  const [settings, clients] = await Promise.all([getFinancialSettings(ctx), repo.listClientOptions(ctx)]);
  return { settings, clientOptions: clients.map((c) => ({ value: c.id, label: c.companyName })) };
}

export async function getDomainsSection(ctx: OrgContext, f: { search?: string; status?: DomainStatus; clientId?: string; renewalDays?: number }) {
  const { settings, clientOptions } = await base(ctx);
  const domains = await repo.listDomainsForOrg(ctx, {
    search: f.search,
    status: f.status,
    clientId: f.clientId,
    renewalBefore: f.renewalDays ? addDays(settings.today, f.renewalDays) : undefined,
  });
  const lines = domains.flatMap(domainToLines);
  const t = dayNumber(settings.today);
  return {
    settings,
    clientOptions,
    rows: domains.map((d) => ({ domain: d, daysUntilRenewal: dayNumber(d.renewalDate) - t })),
    bySource: summarizeBySource(lines, settings.today),
    totals: totals(lines, settings.today),
    activeCount: domains.filter((d) => d.status !== "CANCELLED" && d.status !== "EXPIRED").length,
    renewing30: domains.filter((d) => d.status !== "CANCELLED" && dayNumber(d.renewalDate) - t <= 30).length,
  };
}

export async function getHostingSection(ctx: OrgContext, f: { search?: string; clientId?: string }) {
  const { settings, clientOptions } = await base(ctx);
  const hosting = await repo.listHostingForOrg(ctx, f);
  const lines = hosting.flatMap(hostingToLines);
  const bySource = summarizeBySource(lines, settings.today);
  return {
    settings,
    clientOptions,
    rows: hosting,
    bySource,
    totals: totals(lines, settings.today),
    activeCount: hosting.filter((h) => isWithin(settings.today, h.startDate, h.endDate)).length,
  };
}

export async function getCostsSection(ctx: OrgContext, f: { search?: string; category?: CostCategory; clientId?: string }) {
  const { settings, clientOptions } = await base(ctx);
  const costs = await repo.listCostsForOrg(ctx, f);
  const lines = costs.flatMap(costToLines);
  return { settings, clientOptions, rows: costs, bySource: summarizeBySource(lines, settings.today), totals: totals(lines, settings.today) };
}

export const TIME_PAGE_SIZE = 50;

export async function getTimeSection(ctx: OrgContext, f: repo.TimeFilter & { page: number }) {
  const { settings, clientOptions } = await base(ctx);
  const [{ entries, total }, amounts] = await Promise.all([
    repo.listTimeEntriesForOrg(ctx, f, { skip: (Math.max(1, f.page) - 1) * TIME_PAGE_SIZE, take: TIME_PAGE_SIZE }),
    repo.listTimeEntryAmounts(ctx, f),
  ]);
  const labour = amounts.map(timeEntryToLabour);
  return {
    settings,
    clientOptions,
    entries: entries.map((e) => ({ ...e, labour: labourCost(timeEntryToLabour(e)) })),
    total,
    page: Math.min(Math.max(1, f.page), Math.max(1, Math.ceil(total / TIME_PAGE_SIZE))),
    pageCount: Math.max(1, Math.ceil(total / TIME_PAGE_SIZE)),
    totalHours: sum(labour.map((l) => l.hours)),
    totalLabour: sum(labour.map(labourCost)),
  };
}
