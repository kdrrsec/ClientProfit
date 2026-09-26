import { addDays, addYears } from "./dates";
import type { BillingInterval } from "./intervals";
import { toMoney, type Money, type MoneyInput } from "./money";

/**
 * A FinancialLine is the engine's single, source-agnostic unit of money:
 * "this client pays / costs X per interval between these dates".
 * Services, domains, hosting and other costs are all mapped to lines, so the
 * calculation layer never needs to know where a number came from.
 */
export type LineKind = "REVENUE" | "DIRECT_COST";
export type LineSource = "SERVICE" | "DOMAIN" | "HOSTING" | "COST";

export interface FinancialLine {
  kind: LineKind;
  source: LineSource;
  sourceId: string;
  label: string;
  /** Amount per interval. For ONE_TIME: the full amount, recognised on startDate. */
  amount: Money;
  interval: BillingInterval;
  startDate: Date;
  /** Inclusive. Null = open-ended. */
  endDate: Date | null;
  /** Domain cost lines: which price applies ("FIRST_YEAR" = purchase cost, "RENEWAL" = renewal cost). */
  phase?: "FIRST_YEAR" | "RENEWAL";
}

export interface LabourEntry {
  date: Date;
  hours: Money;
  /** Internal cost price per hour — never the sales rate. */
  hourlyCost: Money;
}

// ─── Source record shapes (structural; Prisma rows satisfy these) ────────────

export interface ServiceRecord {
  id: string;
  name: string;
  billingInterval: BillingInterval;
  sellingPrice: MoneyInput;
  supplierCost: MoneyInput;
  costInterval: BillingInterval | null;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}

export interface DomainRecord {
  id: string;
  domain: string;
  purchaseCost: MoneyInput;
  renewalCost: MoneyInput;
  sellingPrice: MoneyInput;
  registeredAt: Date;
  renewalDate: Date;
  status: "ACTIVE" | "EXPIRING" | "EXPIRED" | "CANCELLED";
  cancelledAt: Date | null;
}

export interface HostingRecord {
  id: string;
  product: string;
  billingInterval: BillingInterval;
  purchaseCost: MoneyInput;
  sellingPrice: MoneyInput;
  startDate: Date;
  endDate: Date | null;
}

export interface CostRecord {
  id: string;
  name: string;
  amount: MoneyInput;
  billingInterval: BillingInterval;
  startDate: Date;
  endDate: Date | null;
}

export interface TimeEntryRecord {
  date: Date;
  hours: MoneyInput;
  hourlyCost: MoneyInput;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

/**
 * Inactive services without an end date are excluded entirely (we don't know
 * when they stopped). Inactive services with an end date keep their history.
 */
export function serviceToLines(s: ServiceRecord): FinancialLine[] {
  if (!s.isActive && s.endDate === null) return [];
  const base = { source: "SERVICE" as const, sourceId: s.id, label: s.name, startDate: s.startDate, endDate: s.endDate };
  const lines: FinancialLine[] = [
    { ...base, kind: "REVENUE", amount: toMoney(s.sellingPrice), interval: s.billingInterval },
  ];
  const cost = toMoney(s.supplierCost);
  if (!cost.isZero()) {
    lines.push({ ...base, kind: "DIRECT_COST", amount: cost, interval: s.costInterval ?? s.billingInterval });
  }
  return lines;
}

/**
 * Domains are billed yearly. Cost in the first registration year is
 * purchaseCost; from the first renewal onwards it is renewalCost. Modelling
 * both as yearly lines over their own date ranges avoids double counting.
 */
export function domainToLines(d: DomainRecord): FinancialLine[] {
  let endDate: Date | null = null;
  if (d.status === "CANCELLED") {
    if (d.cancelledAt === null) return [];
    endDate = d.cancelledAt;
  } else if (d.status === "EXPIRED") {
    endDate = d.cancelledAt ?? addDays(d.renewalDate, -1);
  }

  const base = { source: "DOMAIN" as const, sourceId: d.id, label: d.domain, interval: "YEARLY" as const };
  const firstRenewal = addYears(d.registeredAt, 1);
  const firstYearEnd = addDays(firstRenewal, -1);
  const lines: FinancialLine[] = [
    { ...base, kind: "REVENUE", amount: toMoney(d.sellingPrice), startDate: d.registeredAt, endDate },
  ];
  const purchase = toMoney(d.purchaseCost);
  const renewal = toMoney(d.renewalCost);

  if (purchase.isZero()) {
    // No separate registration price recorded: renewal cost applies from day one.
    if (!renewal.isZero()) {
      lines.push({ ...base, kind: "DIRECT_COST", amount: renewal, startDate: d.registeredAt, endDate, phase: "RENEWAL" });
    }
    return lines;
  }

  const purchaseEnd = endDate !== null && endDate < firstYearEnd ? endDate : firstYearEnd;
  lines.push({ ...base, kind: "DIRECT_COST", amount: purchase, startDate: d.registeredAt, endDate: purchaseEnd, phase: "FIRST_YEAR" });
  if (!renewal.isZero() && (endDate === null || endDate >= firstRenewal)) {
    lines.push({ ...base, kind: "DIRECT_COST", amount: renewal, startDate: firstRenewal, endDate, phase: "RENEWAL" });
  }
  return lines;
}

export function hostingToLines(h: HostingRecord): FinancialLine[] {
  const base = { source: "HOSTING" as const, sourceId: h.id, label: h.product, interval: h.billingInterval, startDate: h.startDate, endDate: h.endDate };
  const lines: FinancialLine[] = [{ ...base, kind: "REVENUE", amount: toMoney(h.sellingPrice) }];
  const cost = toMoney(h.purchaseCost);
  if (!cost.isZero()) lines.push({ ...base, kind: "DIRECT_COST", amount: cost });
  return lines;
}

export function costToLines(c: CostRecord): FinancialLine[] {
  return [
    {
      kind: "DIRECT_COST",
      source: "COST",
      sourceId: c.id,
      label: c.name,
      amount: toMoney(c.amount),
      interval: c.billingInterval,
      startDate: c.startDate,
      endDate: c.endDate,
    },
  ];
}

export function timeEntryToLabour(t: TimeEntryRecord): LabourEntry {
  return { date: t.date, hours: toMoney(t.hours), hourlyCost: toMoney(t.hourlyCost) };
}

export interface ClientSources {
  services?: ServiceRecord[];
  domains?: DomainRecord[];
  hosting?: HostingRecord[];
  costs?: CostRecord[];
  timeEntries?: TimeEntryRecord[];
}

export function buildClientLines(src: ClientSources): { lines: FinancialLine[]; labour: LabourEntry[] } {
  return {
    lines: [
      ...(src.services ?? []).flatMap(serviceToLines),
      ...(src.domains ?? []).flatMap(domainToLines),
      ...(src.hosting ?? []).flatMap(hostingToLines),
      ...(src.costs ?? []).flatMap(costToLines),
    ],
    labour: (src.timeEntries ?? []).map(timeEntryToLabour),
  };
}
