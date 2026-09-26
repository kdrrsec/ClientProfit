import { addDays, dayNumber } from "@/lib/profitability";

export type RenewalKind = "DOMAIN" | "HOSTING" | "SERVICE" | "COST" | "CONTRACT";

export interface RenewalItem {
  kind: RenewalKind;
  id: string;
  label: string;
  clientId: string;
  clientName: string;
  date: Date;
  /** Negative when overdue. */
  daysUntil: number;
  autoRenew: boolean | null;
}

/** Structural input: Prisma rows with these relations satisfy it. */
export interface RenewalSourceClient {
  id: string;
  companyName: string;
  contractRenewalDate: Date | null;
  services: { id: string; name: string; endDate: Date | null; isActive: boolean; billingInterval: string }[];
  domains: { id: string; domain: string; renewalDate: Date; autoRenew: boolean; status: string }[];
  hosting: { id: string; product: string; renewalDate: Date | null; endDate: Date | null }[];
  costs: { id: string; name: string; renewalDate: Date | null; endDate: Date | null }[];
}

export interface RenewalWindow {
  /** Days ahead to include. */
  horizonDays: number;
  /** Days back to include overdue items (default 30). */
  overdueDays?: number;
}

/**
 * Renewals are derived from the dates on the underlying records (single
 * source of truth). Items that have already ended are skipped.
 */
export function collectRenewals(clients: RenewalSourceClient[], today: Date, window: RenewalWindow): RenewalItem[] {
  const from = dayNumber(addDays(today, -(window.overdueDays ?? 30)));
  const to = dayNumber(addDays(today, window.horizonDays));
  const t = dayNumber(today);
  const items: RenewalItem[] = [];

  const push = (kind: RenewalKind, id: string, label: string, client: RenewalSourceClient, date: Date | null, autoRenew: boolean | null) => {
    if (!date) return;
    const d = dayNumber(date);
    if (d < from || d > to) return;
    items.push({ kind, id, label, clientId: client.id, clientName: client.companyName, date, daysUntil: d - t, autoRenew });
  };
  const ended = (end: Date | null) => end !== null && dayNumber(end) < t;

  for (const c of clients) {
    push("CONTRACT", c.id, "Contract renewal", c, c.contractRenewalDate, null);
    for (const d of c.domains) {
      if (d.status === "CANCELLED") continue;
      push("DOMAIN", d.id, d.domain, c, d.renewalDate, d.autoRenew);
    }
    for (const h of c.hosting) {
      if (!ended(h.endDate)) push("HOSTING", h.id, h.product, c, h.renewalDate, null);
    }
    for (const x of c.costs) {
      if (!ended(x.endDate)) push("COST", x.id, x.name, c, x.renewalDate, null);
    }
    for (const s of c.services) {
      // A service end date inside the window is a contract/service renewal decision.
      if (s.isActive && s.billingInterval !== "ONE_TIME") push("SERVICE", s.id, s.name, c, s.endDate, null);
    }
  }
  return items.sort((a, b) => a.daysUntil - b.daysUntil || a.clientName.localeCompare(b.clientName));
}
