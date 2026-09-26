import { describe, expect, it } from "vitest";
import { clientSchema, domainSchema, serviceSchema, timeEntrySchema } from "./records";

const base = { name: "Website", type: "WEBSITE", billingInterval: "MONTHLY", sellingPrice: "89", supplierCost: "0", costInterval: "SAME", startDate: "2026-01-01" };

describe("record validation", () => {
  it("parses money as exact decimal strings, accepting a comma", () => {
    const r = serviceSchema.parse({ ...base, sellingPrice: "89,50", isActive: "on" });
    expect(r.sellingPrice).toBe("89.50");
    expect(r.costInterval).toBeNull();
    expect(r.isActive).toBe(true);
  });

  it("rejects negative amounts, too many decimals and thousand separators", () => {
    for (const bad of ["-5", "1.234", "1.000,00", "abc", ""]) {
      expect(serviceSchema.safeParse({ ...base, sellingPrice: bad }).success, bad).toBe(false);
    }
  });

  it("treats a missing checkbox as false and empty dates as null", () => {
    const r = serviceSchema.parse({ ...base, endDate: "" });
    expect(r.isActive).toBe(false);
    expect(r.endDate).toBeNull();
  });

  it("rejects an end date before the start date and impossible dates", () => {
    expect(serviceSchema.safeParse({ ...base, endDate: "2025-12-31" }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, startDate: "2026-02-30" }).success).toBe(false);
  });

  it("normalises domains and websites", () => {
    const d = domainSchema.parse({ domain: "Example.NL", purchaseCost: "0", renewalCost: "12", sellingPrice: "24", registeredAt: "2026-01-01", renewalDate: "2027-01-01", status: "ACTIVE" });
    expect(d.domain).toBe("example.nl");
    expect(domainSchema.safeParse({ ...d, domain: "not a domain", registeredAt: "2026-01-01", renewalDate: "2027-01-01", purchaseCost: "0", renewalCost: "1", sellingPrice: "1" }).success).toBe(false);
    const c = clientSchema.parse({ companyName: "Acme", status: "ACTIVE", website: "acme.nl" });
    expect(c.website).toBe("https://acme.nl");
    expect(c.email).toBeNull();
  });

  it("limits hours to (0, 24]", () => {
    const ok = timeEntrySchema.parse({ date: "2026-09-01", description: "x", hours: "1,5", hourlyCost: "50" });
    expect(ok.hours).toBe("1.5");
    expect(timeEntrySchema.safeParse({ date: "2026-09-01", description: "x", hours: "0", hourlyCost: "50" }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ date: "2026-09-01", description: "x", hours: "25", hourlyCost: "50" }).success).toBe(false);
  });
});
