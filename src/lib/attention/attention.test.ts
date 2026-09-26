import { describe, expect, it } from "vitest";
import { calculateClientProfitability, type ServiceRecord } from "@/lib/profitability";
import type { RenewalItem } from "@/lib/renewals";
import { collectAttentionItems, type AttentionClient } from "./index";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d("2026-09-26");

type Svc = ServiceRecord & { type: string };
const svc = (p: Partial<Svc>): Svc => ({
  id: "s", name: "Website", type: "WEBSITE", billingInterval: "MONTHLY", sellingPrice: "100", supplierCost: "0",
  costInterval: null, startDate: d("2025-01-01"), endDate: null, isActive: true, ...p,
});

function client(services: Svc[], hours = "0", extra: Partial<AttentionClient> = {}): AttentionClient {
  const timeEntries = hours === "0" ? [] : [{ date: d("2026-09-01"), hours, hourlyCost: "50" }];
  return {
    id: "c", companyName: "Acme", services, domains: [], hosting: [],
    profitability: calculateClientProfitability({ services, timeEntries }, { asOf: TODAY, windowMonths: 1 }),
    ...extra,
  };
}

const codes = (c: AttentionClient[], r: RenewalItem[] = []) => collectAttentionItems(c, r, { today: TODAY }).map((i) => i.code);

describe("collectAttentionItems", () => {
  it("flags negative margin as critical", () => {
    const items = collectAttentionItems([client([svc({ sellingPrice: "50", supplierCost: "80" })])], [], { today: TODAY });
    expect(items[0]).toMatchObject({ code: "NEGATIVE_MARGIN", severity: "critical" });
  });

  it("distinguishes labour-driven low margin from other low margins", () => {
    expect(codes([client([svc({ sellingPrice: "100" })], "1.6")])).toEqual(["HIGH_LABOUR_LOW_MARGIN"]); // 80 labour
    expect(codes([client([svc({ sellingPrice: "100", supplierCost: "75" })])])).toEqual(["LOW_MARGIN"]);
  });

  it("flags missing selling price and missing supplier cost", () => {
    expect(codes([client([svc({ name: "Free", sellingPrice: "0" })])])).toContain("MISSING_SELLING_PRICE");
    expect(codes([client([svc({ type: "HOSTING", sellingPrice: "15", supplierCost: "0" })])])).toEqual(["MISSING_COST"]);
    expect(codes([client([svc({ type: "WEBSITE", supplierCost: "0" })])])).toEqual([]);
  });

  it("ignores ended services", () => {
    expect(codes([client([svc({ sellingPrice: "0", endDate: d("2026-01-01"), isActive: false })])])).toEqual([]);
  });

  it("flags domains within 30 days and hosting within 14 days", () => {
    const r = (kind: RenewalItem["kind"], daysUntil: number, autoRenew: boolean | null = false): RenewalItem => ({
      kind, id: kind + daysUntil, label: "x", clientId: "c", clientName: "Acme", date: TODAY, daysUntil, autoRenew,
    });
    const items = collectAttentionItems([], [r("DOMAIN", -2), r("DOMAIN", 20), r("DOMAIN", 45), r("HOSTING", 10, null), r("HOSTING", 20, null)], { today: TODAY });
    expect(items.map((i) => [i.code, i.severity])).toEqual([
      ["DOMAIN_OVERDUE", "critical"],
      ["HOSTING_RENEWAL", "warning"],
      ["DOMAIN_EXPIRING", "warning"],
    ]);
  });
});
