import { describe, expect, it } from "vitest";
import { collectRenewals, type RenewalSourceClient } from "./index";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const TODAY = d("2026-09-26");

const client = (p: Partial<RenewalSourceClient> = {}): RenewalSourceClient => ({
  id: "c1", companyName: "Acme", contractRenewalDate: null, services: [], domains: [], hosting: [], costs: [], ...p,
});

describe("collectRenewals", () => {
  it("collects every renewal source inside the window, sorted by date", () => {
    const items = collectRenewals(
      [
        client({
          contractRenewalDate: d("2026-10-20"),
          domains: [{ id: "d", domain: "acme.nl", renewalDate: d("2026-10-01"), autoRenew: false, status: "ACTIVE" }],
          hosting: [{ id: "h", product: "VPS", renewalDate: d("2026-10-05"), endDate: null }],
          costs: [{ id: "x", name: "Plugin", renewalDate: d("2026-12-20"), endDate: null }],
          services: [{ id: "s", name: "SEO", endDate: d("2026-10-31"), isActive: true, billingInterval: "MONTHLY" }],
        }),
      ],
      TODAY,
      { horizonDays: 90 },
    );
    expect(items.map((i) => [i.kind, i.daysUntil])).toEqual([
      ["DOMAIN", 5],
      ["HOSTING", 9],
      ["CONTRACT", 24],
      ["SERVICE", 35],
      ["COST", 85],
    ]);
  });

  it("respects the horizon and includes recent overdue items", () => {
    const items = collectRenewals(
      [
        client({
          domains: [
            { id: "a", domain: "late.nl", renewalDate: d("2026-09-20"), autoRenew: false, status: "ACTIVE" },
            { id: "b", domain: "far.nl", renewalDate: d("2026-11-10"), autoRenew: true, status: "ACTIVE" },
            { id: "c", domain: "old.nl", renewalDate: d("2026-01-01"), autoRenew: false, status: "ACTIVE" },
          ],
        }),
      ],
      TODAY,
      { horizonDays: 30 },
    );
    expect(items.map((i) => [i.label, i.daysUntil])).toEqual([["late.nl", -6]]);
  });

  it("skips cancelled domains and ended hosting/costs", () => {
    const items = collectRenewals(
      [
        client({
          domains: [{ id: "a", domain: "gone.nl", renewalDate: d("2026-10-01"), autoRenew: false, status: "CANCELLED" }],
          hosting: [{ id: "h", product: "Old", renewalDate: d("2026-10-01"), endDate: d("2026-09-01") }],
          costs: [{ id: "x", name: "Old tool", renewalDate: d("2026-10-01"), endDate: d("2026-09-25") }],
        }),
      ],
      TODAY,
      { horizonDays: 30 },
    );
    expect(items).toEqual([]);
  });
});
