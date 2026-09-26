import type Decimal from "decimal.js";
import { isRecurring, isWithin, toMoney, type BillingInterval, type ClientProfitability, type MoneyInput } from "@/lib/profitability";
import type { RenewalItem } from "@/lib/renewals";

export type AttentionSeverity = "critical" | "warning" | "info";

export type AttentionCode =
  | "NEGATIVE_MARGIN"
  | "LOW_MARGIN"
  | "HIGH_LABOUR_LOW_MARGIN"
  | "COSTS_WITHOUT_REVENUE"
  | "MISSING_SELLING_PRICE"
  | "MISSING_COST"
  | "DOMAIN_EXPIRING"
  | "DOMAIN_OVERDUE"
  | "HOSTING_RENEWAL";

export interface AttentionItem {
  code: AttentionCode;
  severity: AttentionSeverity;
  clientId: string;
  clientName: string;
  /** Plain facts; numbers are passed separately so the UI formats them. */
  subject: string | null;
  margin?: Decimal | null;
  labourShare?: Decimal;
  daysUntil?: number;
}

export interface AttentionClient {
  id: string;
  companyName: string;
  profitability: ClientProfitability;
  services: { name: string; type: string; sellingPrice: MoneyInput; supplierCost: MoneyInput; billingInterval: BillingInterval; startDate: Date; endDate: Date | null; isActive: boolean }[];
  domains: { domain: string; sellingPrice: MoneyInput; purchaseCost: MoneyInput; renewalCost: MoneyInput; status: string }[];
  hosting: { product: string; sellingPrice: MoneyInput; purchaseCost: MoneyInput; startDate: Date; endDate: Date | null }[];
}

export interface AttentionOptions {
  today: Date;
  domainWarningDays?: number;
  hostingWarningDays?: number;
  /** Labour as % of monthly revenue above which a low margin is flagged as labour-driven. */
  highLabourSharePercent?: number;
}

/** Service types that almost always have a supplier cost; a zero cost is probably missing data. */
const COST_EXPECTED_TYPES = new Set(["HOSTING", "DOMAIN", "LICENSE"]);

const SEVERITY_RANK: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function collectAttentionItems(clients: AttentionClient[], renewals: RenewalItem[], opts: AttentionOptions): AttentionItem[] {
  const domainDays = opts.domainWarningDays ?? 30;
  const hostingDays = opts.hostingWarningDays ?? 14;
  const highLabour = toMoney(String(opts.highLabourSharePercent ?? 30));
  const items: AttentionItem[] = [];

  for (const c of clients) {
    const base = { clientId: c.id, clientName: c.companyName };
    const p = c.profitability;

    if (p.status === "NEGATIVE") {
      items.push({ ...base, code: "NEGATIVE_MARGIN", severity: "critical", subject: null, margin: p.margin });
    } else if (p.status === "LOW") {
      const share = p.monthly.revenue.isZero() ? null : p.monthly.labour.dividedBy(p.monthly.revenue).times(100);
      if (share && share.greaterThanOrEqualTo(highLabour)) {
        items.push({ ...base, code: "HIGH_LABOUR_LOW_MARGIN", severity: "warning", subject: null, margin: p.margin, labourShare: share });
      } else {
        items.push({ ...base, code: "LOW_MARGIN", severity: "info", subject: null, margin: p.margin });
      }
    } else if (p.status === "NO_REVENUE" && !p.monthly.directCosts.plus(p.monthly.labour).isZero()) {
      items.push({ ...base, code: "COSTS_WITHOUT_REVENUE", severity: "warning", subject: null });
    }

    for (const s of c.services) {
      const active = s.isActive && isWithin(opts.today, s.startDate, s.endDate);
      if (!active || !isRecurring(s.billingInterval)) continue;
      if (toMoney(s.sellingPrice).isZero()) items.push({ ...base, code: "MISSING_SELLING_PRICE", severity: "warning", subject: s.name });
      else if (COST_EXPECTED_TYPES.has(s.type) && toMoney(s.supplierCost).isZero())
        items.push({ ...base, code: "MISSING_COST", severity: "info", subject: s.name });
    }
    for (const d of c.domains) {
      if (d.status === "CANCELLED" || d.status === "EXPIRED") continue;
      if (toMoney(d.sellingPrice).isZero()) items.push({ ...base, code: "MISSING_SELLING_PRICE", severity: "warning", subject: d.domain });
      if (toMoney(d.renewalCost).isZero() && toMoney(d.purchaseCost).isZero())
        items.push({ ...base, code: "MISSING_COST", severity: "info", subject: d.domain });
    }
    for (const h of c.hosting) {
      if (!isWithin(opts.today, h.startDate, h.endDate)) continue;
      if (toMoney(h.sellingPrice).isZero()) items.push({ ...base, code: "MISSING_SELLING_PRICE", severity: "warning", subject: h.product });
      if (toMoney(h.purchaseCost).isZero()) items.push({ ...base, code: "MISSING_COST", severity: "info", subject: h.product });
    }
  }

  for (const r of renewals) {
    const base = { clientId: r.clientId, clientName: r.clientName, subject: r.label, daysUntil: r.daysUntil };
    if (r.kind === "DOMAIN") {
      if (r.daysUntil < 0) items.push({ ...base, code: "DOMAIN_OVERDUE", severity: "critical" });
      else if (r.daysUntil <= domainDays) items.push({ ...base, code: "DOMAIN_EXPIRING", severity: r.autoRenew ? "info" : "warning" });
    } else if (r.kind === "HOSTING" && r.daysUntil <= hostingDays) {
      items.push({ ...base, code: "HOSTING_RENEWAL", severity: r.daysUntil < 0 ? "critical" : "warning" });
    }
  }

  return items.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (a.daysUntil ?? 0) - (b.daysUntil ?? 0) || a.clientName.localeCompare(b.clientName),
  );
}
