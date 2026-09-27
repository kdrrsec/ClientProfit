import "server-only";
import type Decimal from "decimal.js";
import { summarizeBySource } from "@/lib/profitability";
import { collectRenewals, type RenewalItem, type RenewalKind } from "@/lib/renewals";
import type { OrgContext } from "@/server/auth/context";
import { listClientsWithFinancials } from "@/server/repositories/clients";
import { calculateForClient, getFinancialSettings } from "./profitability";

export const RENEWAL_WINDOWS = [7, 30, 90] as const;
export type RenewalWindow = (typeof RENEWAL_WINDOWS)[number];

/** Overdue items are shown up to this many days back. */
const OVERDUE_DAYS = 365;

export interface RenewalRow extends RenewalItem {
  /** What renews: yearly revenue of the item (or of the client, for contracts), or yearly cost for a cost item. */
  yearlyValue: Decimal | null;
  valueKind: "revenue" | "cost";
}

export async function getRenewals(ctx: OrgContext, f: { window: RenewalWindow; kind?: RenewalKind; clientId?: string }) {
  const settings = await getFinancialSettings(ctx);
  const clients = await listClientsWithFinancials(ctx, { timeEntriesSince: settings.timeEntriesSince });

  const rows: RenewalRow[] = [];
  for (const client of clients) {
    if (f.clientId && client.id !== f.clientId) continue;
    const calc = calculateForClient(client, settings);
    const bySource = summarizeBySource(calc.lines, settings.today);
    for (const item of collectRenewals([client], settings.today, { horizonDays: 90, overdueDays: OVERDUE_DAYS })) {
      if (f.kind && item.kind !== f.kind) continue;
      const figures = bySource.get(item.id);
      rows.push({
        ...item,
        valueKind: item.kind === "COST" ? "cost" : "revenue",
        yearlyValue:
          item.kind === "CONTRACT" ? calc.profitability.annual.revenue : item.kind === "COST" ? (figures?.annualCosts ?? null) : (figures?.annualRevenue ?? null),
      });
    }
  }
  rows.sort((a, b) => a.daysUntil - b.daysUntil || a.clientName.localeCompare(b.clientName));

  return {
    settings,
    counts: {
      overdue: rows.filter((r) => r.daysUntil < 0).length,
      7: rows.filter((r) => r.daysUntil >= 0 && r.daysUntil <= 7).length,
      30: rows.filter((r) => r.daysUntil >= 0 && r.daysUntil <= 30).length,
      90: rows.filter((r) => r.daysUntil >= 0 && r.daysUntil <= 90).length,
    },
    rows: rows.filter((r) => r.daysUntil <= f.window),
    clientOptions: clients.map((c) => ({ value: c.id, label: c.companyName })),
  };
}
