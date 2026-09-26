/**
 * Converts DB records into plain string form defaults on the server, so no
 * Decimal/Date instances cross into client components.
 */
type Decimalish = { toFixed(dp: number): string };

export const isoDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const money = (v: Decimalish | null | undefined) => (v ? v.toFixed(2).replace(".", ",") : "");
const text = (v: string | null | undefined) => v ?? "";
const bool = (v: boolean) => (v ? "on" : "");

export function clientDefaults(c?: {
  companyName: string; contactName: string | null; email: string | null; phone: string | null; website: string | null;
  addressLine1: string | null; addressLine2: string | null; postalCode: string | null; city: string | null; country: string | null;
  vatNumber: string | null; chamberOfCommerce: string | null; status: string; startDate: Date | null; contractRenewalDate: Date | null; notes: string | null;
}, today?: string): Record<string, string> {
  if (!c) return { status: "ACTIVE", country: "NL", startDate: today ?? "" };
  return {
    companyName: c.companyName, contactName: text(c.contactName), email: text(c.email), phone: text(c.phone), website: text(c.website),
    addressLine1: text(c.addressLine1), addressLine2: text(c.addressLine2), postalCode: text(c.postalCode), city: text(c.city),
    country: text(c.country), vatNumber: text(c.vatNumber), chamberOfCommerce: text(c.chamberOfCommerce), status: c.status,
    startDate: isoDate(c.startDate), contractRenewalDate: isoDate(c.contractRenewalDate), notes: text(c.notes),
  };
}

export function serviceDefaults(s: {
  name: string; type: string; description: string | null; billingInterval: string; sellingPrice: Decimalish; supplier: string | null;
  supplierCost: Decimalish; costInterval: string | null; startDate: Date; endDate: Date | null; isActive: boolean;
} | undefined, today: string, defaultInterval: string): Record<string, string> {
  if (!s) return { type: "WEBSITE", billingInterval: defaultInterval, costInterval: "SAME", supplierCost: "0,00", startDate: today, isActive: "on" };
  return {
    name: s.name, type: s.type, description: text(s.description), billingInterval: s.billingInterval, sellingPrice: money(s.sellingPrice),
    supplier: text(s.supplier), supplierCost: money(s.supplierCost), costInterval: s.costInterval ?? "SAME",
    startDate: isoDate(s.startDate), endDate: isoDate(s.endDate), isActive: bool(s.isActive),
  };
}

export function domainDefaults(d: {
  domain: string; registrar: string | null; purchaseCost: Decimalish; renewalCost: Decimalish; sellingPrice: Decimalish;
  registeredAt: Date; renewalDate: Date; autoRenew: boolean; status: string; cancelledAt: Date | null; notes: string | null;
} | undefined, today: string, nextYear: string): Record<string, string> {
  if (!d) return { purchaseCost: "0,00", registeredAt: today, renewalDate: nextYear, autoRenew: "on", status: "ACTIVE" };
  return {
    domain: d.domain, registrar: text(d.registrar), purchaseCost: money(d.purchaseCost), renewalCost: money(d.renewalCost),
    sellingPrice: money(d.sellingPrice), registeredAt: isoDate(d.registeredAt), renewalDate: isoDate(d.renewalDate),
    autoRenew: bool(d.autoRenew), status: d.status, cancelledAt: isoDate(d.cancelledAt), notes: text(d.notes),
  };
}

export function hostingDefaults(h: {
  product: string; provider: string | null; server: string | null; billingInterval: string; purchaseCost: Decimalish; sellingPrice: Decimalish;
  startDate: Date; endDate: Date | null; renewalDate: Date | null; notes: string | null;
} | undefined, today: string, defaultInterval: string): Record<string, string> {
  if (!h) return { billingInterval: defaultInterval === "ONE_TIME" ? "MONTHLY" : defaultInterval, startDate: today };
  return {
    product: h.product, provider: text(h.provider), server: text(h.server), billingInterval: h.billingInterval,
    purchaseCost: money(h.purchaseCost), sellingPrice: money(h.sellingPrice), startDate: isoDate(h.startDate),
    endDate: isoDate(h.endDate), renewalDate: isoDate(h.renewalDate), notes: text(h.notes),
  };
}

export function costDefaults(c: {
  name: string; category: string; amount: Decimalish; billingInterval: string; startDate: Date; endDate: Date | null; renewalDate: Date | null; notes: string | null;
} | undefined, today: string, defaultInterval: string): Record<string, string> {
  if (!c) return { category: "SOFTWARE", billingInterval: defaultInterval, startDate: today };
  return {
    name: c.name, category: c.category, amount: money(c.amount), billingInterval: c.billingInterval, startDate: isoDate(c.startDate),
    endDate: isoDate(c.endDate), renewalDate: isoDate(c.renewalDate), notes: text(c.notes),
  };
}

export function timeEntryDefaults(t: { date: Date; description: string; hours: Decimalish; hourlyCost: Decimalish } | undefined, today: string, defaultHourlyCost: string): Record<string, string> {
  if (!t) return { date: today, hourlyCost: defaultHourlyCost.replace(".", ",") };
  return { date: isoDate(t.date), description: t.description, hours: t.hours.toFixed(2).replace(/\.?0+$/, "").replace(".", ","), hourlyCost: money(t.hourlyCost) };
}
