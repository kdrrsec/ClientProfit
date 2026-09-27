import { describe, expect, it } from "vitest";
import { settingsSchema } from "./settings";

const valid = {
  name: "Acme",
  currency: "EUR",
  timezone: "Europe/Amsterdam",
  defaultHourlyCost: "50,00",
  lowMarginThreshold: "30",
  negativeMarginThreshold: "0",
  labourWindowMonths: "3",
  defaultBillingInterval: "MONTHLY",
};

describe("settings validation", () => {
  it("accepts valid settings and normalises decimals", () => {
    const s = settingsSchema.parse(valid);
    expect(s.defaultHourlyCost).toBe("50.00");
    expect(s.labourWindowMonths).toBe(3);
    expect(s.logoUrl).toBeNull();
  });

  it("rejects unknown timezones and currencies", () => {
    expect(settingsSchema.safeParse({ ...valid, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, currency: "BTC" }).success).toBe(false);
  });

  it("requires low threshold ≥ negative threshold", () => {
    const r = settingsSchema.safeParse({ ...valid, lowMarginThreshold: "5", negativeMarginThreshold: "10" });
    expect(r.success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, lowMarginThreshold: "12,5", negativeMarginThreshold: "-5" }).success).toBe(true);
  });

  it("bounds the labour window and only allows https logos", () => {
    expect(settingsSchema.safeParse({ ...valid, labourWindowMonths: "0" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, labourWindowMonths: "13" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, logoUrl: "http://example.com/logo.png" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, logoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(settingsSchema.parse({ ...valid, logoUrl: "https://example.com/logo.png" }).logoUrl).toBe("https://example.com/logo.png");
  });
});
