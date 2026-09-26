import { describe, expect, it } from "vitest";
import {
  Money,
  buildClientLines,
  calculateAnnualCosts,
  calculateAnnualProfit,
  calculateAnnualRevenue,
  calculateClientProfitability,
  calculateMargin,
  calculateMonthlyCosts,
  calculateMonthlyLabour,
  calculateMonthlyProfit,
  calculateMonthlyRevenue,
  calculateMonthlyTimeline,
  domainToLines,
  getMarginStatus,
  roundMoney,
  roundPercent,
  serviceToLines,
  summarizeBySource,
  summarizePortfolio,
  toMoney,
  toMonthly,
  toYearly,
  utcDate,
  type ServiceRecord,
  type TimeEntryRecord,
} from "./index";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const m = (v: string) => new Money(v);
const fixed = (v: { toFixed(n: number): string }, n = 2) => v.toFixed(n);
const ASOF = d("2026-09-26");

function service(p: Partial<ServiceRecord> & Pick<ServiceRecord, "sellingPrice">): ServiceRecord {
  return {
    id: p.name ?? "svc",
    name: "svc",
    billingInterval: "MONTHLY",
    supplierCost: "0",
    costInterval: null,
    startDate: d("2025-01-01"),
    endDate: null,
    isActive: true,
    ...p,
  };
}

describe("interval normalisation", () => {
  it("normalises to monthly: monthly = amount, quarterly = /3, yearly = /12, one-time = 0", () => {
    expect(fixed(toMonthly(m("89"), "MONTHLY"))).toBe("89.00");
    expect(fixed(toMonthly(m("300"), "QUARTERLY"))).toBe("100.00");
    expect(fixed(toMonthly(m("12"), "YEARLY"))).toBe("1.00");
    expect(fixed(toMonthly(m("1500"), "ONE_TIME"))).toBe("0.00");
  });

  it("keeps yearly equivalents exact for repeating monthly fractions", () => {
    expect(toYearly(m("100"), "QUARTERLY").toString()).toBe("400");
    expect(toYearly(m("9.99"), "MONTHLY").toString()).toBe("119.88");
  });

  it("ARR = MRR × 12 with no float drift", () => {
    const { lines } = buildClientLines({
      services: [service({ name: "a", sellingPrice: "100", billingInterval: "QUARTERLY" })],
    });
    const mrr = calculateMonthlyRevenue(lines, ASOF);
    expect(calculateAnnualRevenue(lines, ASOF).toString()).toBe("400");
    expect(roundMoney(mrr.times(12)).toFixed(2)).toBe("400.00");
    expect(fixed(mrr)).toBe("33.33");
  });

  it("rejects JS numbers for money", () => {
    expect(() => toMoney(0.1 as unknown as string)).toThrow(TypeError);
  });

  it("does not suffer from binary float errors", () => {
    const sum = toMoney("0.1").plus(toMoney("0.2"));
    expect(sum.toString()).toBe("0.3");
  });
});

describe("domain example from the spec", () => {
  it("€12/yr cost, €24/yr price → €1/mo cost, annual profit €12", () => {
    const lines = domainToLines({
      id: "dom",
      domain: "example.nl",
      purchaseCost: "0",
      renewalCost: "12",
      sellingPrice: "24",
      registeredAt: d("2024-03-01"),
      renewalDate: d("2027-03-01"),
      status: "ACTIVE",
      cancelledAt: null,
    });
    expect(fixed(calculateMonthlyCosts(lines, ASOF))).toBe("1.00");
    expect(fixed(calculateAnnualRevenue(lines, ASOF))).toBe("24.00");
    expect(fixed(calculateAnnualCosts(lines, ASOF))).toBe("12.00");
    expect(fixed(calculateAnnualProfit(lines, [], ASOF))).toBe("12.00");
  });

  it("uses purchase cost in year one and renewal cost afterwards, never both", () => {
    const lines = domainToLines({
      id: "dom",
      domain: "new.nl",
      purchaseCost: "5",
      renewalCost: "15",
      sellingPrice: "24",
      registeredAt: d("2026-01-15"),
      renewalDate: d("2027-01-15"),
      status: "ACTIVE",
      cancelledAt: null,
    });
    expect(fixed(calculateAnnualCosts(lines, d("2026-06-01")))).toBe("5.00");
    expect(fixed(calculateAnnualCosts(lines, d("2027-01-14")))).toBe("5.00");
    expect(fixed(calculateAnnualCosts(lines, d("2027-01-15")))).toBe("15.00");
  });

  it("excludes cancelled domains after cancellation and cancelled ones without a date entirely", () => {
    const base = {
      id: "dom", domain: "x.nl", purchaseCost: "0", renewalCost: "10", sellingPrice: "20",
      registeredAt: d("2024-01-01"), renewalDate: d("2027-01-01"),
    };
    expect(domainToLines({ ...base, status: "CANCELLED", cancelledAt: null })).toEqual([]);
    const cancelled = domainToLines({ ...base, status: "CANCELLED", cancelledAt: d("2026-06-30") });
    expect(fixed(calculateAnnualRevenue(cancelled, d("2026-06-30")))).toBe("20.00");
    expect(fixed(calculateAnnualRevenue(cancelled, d("2026-07-01")))).toBe("0.00");
  });
});

describe("client profitability", () => {
  it("Kapsalon Zafer: website 89 + hosting 15 + maintenance 32 /mo + domain 9 /yr", () => {
    const result = calculateClientProfitability(
      {
        services: [
          service({ name: "Website", sellingPrice: "89" }),
          service({ name: "Hosting", sellingPrice: "15", supplierCost: "4" }),
          service({ name: "Maintenance", sellingPrice: "32" }),
          service({ name: "Domain", sellingPrice: "9", billingInterval: "YEARLY", supplierCost: "6" }),
        ],
      },
      { asOf: ASOF },
    );
    expect(fixed(result.monthly.revenue)).toBe("136.75");
    expect(fixed(result.annual.revenue)).toBe("1641.00");
    expect(fixed(result.annual.directCosts)).toBe("54.00");
    expect(fixed(result.annual.profit)).toBe("1587.00");
    expect(result.recurringRevenueLines).toBe(4);
  });

  it("spec example: revenue 149, direct 17, labour 50 → profit 82, margin 55%", () => {
    const profit = calculateMonthlyProfit(
      buildClientLines({ services: [service({ sellingPrice: "149", supplierCost: "17" })] }).lines,
      [{ date: d("2026-09-01"), hours: m("3"), hourlyCost: m("50") }],
      ASOF,
    );
    expect(fixed(profit)).toBe("82.00");
    expect(roundPercent(calculateMargin(profit, m("149"))!).toFixed(1)).toBe("55.0");
  });

  it("Client C: 299 revenue, 100 direct costs, 50 labour per month", () => {
    const entries: TimeEntryRecord[] = [
      { date: d("2026-07-10"), hours: "1", hourlyCost: "50" },
      { date: d("2026-08-10"), hours: "1", hourlyCost: "50" },
      { date: d("2026-09-10"), hours: "1", hourlyCost: "50" },
    ];
    const r = calculateClientProfitability(
      { services: [service({ sellingPrice: "299", supplierCost: "100" })], timeEntries: entries },
      { asOf: ASOF },
    );
    expect(fixed(r.monthly.labour)).toBe("50.00");
    expect(fixed(r.monthlyHours)).toBe("1.00");
    expect(fixed(r.monthly.profit)).toBe("149.00");
    expect(fixed(r.annual.profit)).toBe("1788.00");
    expect(roundPercent(r.margin!).toFixed(1)).toBe("49.8");
    expect(r.status).toBe("POSITIVE");
  });

  it("uses internal hourly cost: 2h × €50 = €100 labour", () => {
    const labour = calculateMonthlyLabour([{ date: d("2026-09-20"), hours: m("2"), hourlyCost: m("50") }], ASOF, {
      windowMonths: 1,
    });
    expect(fixed(labour)).toBe("100.00");
  });

  it("averages labour over the trailing window and ignores entries outside it", () => {
    const entries = [
      { date: d("2026-06-26"), hours: m("10"), hourlyCost: m("50") }, // outside (window starts 06-27)
      { date: d("2026-06-27"), hours: m("3"), hourlyCost: m("50") },
      { date: d("2026-09-26"), hours: m("3"), hourlyCost: m("50") },
    ];
    expect(fixed(calculateMonthlyLabour(entries, ASOF))).toBe("100.00");
  });

  it("does not under-cost new clients by averaging over months before they started", () => {
    const entries = [{ date: d("2026-09-10"), hours: m("2"), hourlyCost: m("50") }];
    // Client started 2026-09-01 → less than a month old → window counts as 1 month.
    expect(fixed(calculateMonthlyLabour(entries, ASOF, { activeSince: d("2026-09-01") }))).toBe("100.00");
  });

  it("excludes one-time revenue from run-rate figures", () => {
    const { lines } = buildClientLines({
      services: [service({ sellingPrice: "2500", billingInterval: "ONE_TIME", startDate: d("2026-09-01") })],
    });
    expect(fixed(calculateMonthlyRevenue(lines, ASOF))).toBe("0.00");
  });

  it("respects service start/end dates and inactive flags", () => {
    const ended = service({ sellingPrice: "50", endDate: d("2026-08-31"), isActive: false });
    const inactiveNoEnd = service({ sellingPrice: "50", isActive: false });
    const future = service({ sellingPrice: "50", startDate: d("2026-10-01") });
    expect(serviceToLines(inactiveNoEnd)).toEqual([]);
    const { lines } = buildClientLines({ services: [ended, future] });
    expect(fixed(calculateMonthlyRevenue(lines, ASOF))).toBe("0.00");
    expect(fixed(calculateMonthlyRevenue(lines, d("2026-08-31")))).toBe("50.00");
  });

  it("supports a supplier cost billed on a different interval than the service", () => {
    const { lines } = buildClientLines({
      services: [service({ sellingPrice: "20", supplierCost: "120", costInterval: "YEARLY" })],
    });
    expect(fixed(calculateMonthlyCosts(lines, ASOF))).toBe("10.00");
  });

  it("includes hosting and other costs", () => {
    const r = calculateClientProfitability(
      {
        hosting: [{ id: "h", product: "Managed WP", billingInterval: "MONTHLY", purchaseCost: "6", sellingPrice: "20", startDate: d("2025-01-01"), endDate: null }],
        costs: [{ id: "c", name: "Plugin licence", amount: "60", billingInterval: "YEARLY", startDate: d("2025-01-01"), endDate: null }],
      },
      { asOf: ASOF },
    );
    expect(fixed(r.monthly.revenue)).toBe("20.00");
    expect(fixed(r.monthly.directCosts)).toBe("11.00");
    expect(fixed(r.monthly.profit)).toBe("9.00");
  });

  it("negative margin when costs exceed revenue; no margin without revenue", () => {
    const neg = calculateClientProfitability({ services: [service({ sellingPrice: "10", supplierCost: "15" })] }, { asOf: ASOF });
    expect(neg.status).toBe("NEGATIVE");
    expect(roundPercent(neg.margin!).toFixed(1)).toBe("-50.0");

    const none = calculateClientProfitability(
      { costs: [{ id: "c", name: "x", amount: "10", billingInterval: "MONTHLY", startDate: d("2025-01-01"), endDate: null }] },
      { asOf: ASOF },
    );
    expect(none.margin).toBeNull();
    expect(none.status).toBe("NO_REVENUE");
  });
});

describe("margin status", () => {
  it("classifies against configurable thresholds", () => {
    const t = { low: m("30"), negative: m("0") };
    expect(getMarginStatus(m("-0.1"), t)).toBe("NEGATIVE");
    expect(getMarginStatus(m("0"), t)).toBe("LOW");
    expect(getMarginStatus(m("29.99"), t)).toBe("LOW");
    expect(getMarginStatus(m("30"), t)).toBe("POSITIVE");
    expect(getMarginStatus(m("25"), { low: "20", negative: "5" })).toBe("POSITIVE");
    expect(getMarginStatus(null, t)).toBe("NO_REVENUE");
  });
});

describe("portfolio", () => {
  it("sums clients, computes weighted margin and profit contribution", () => {
    const a = calculateClientProfitability({ services: [service({ sellingPrice: "100", supplierCost: "20" })] }, { asOf: ASOF });
    const b = calculateClientProfitability({ services: [service({ sellingPrice: "300", supplierCost: "200" })] }, { asOf: ASOF });
    const s = summarizePortfolio([
      { clientId: "a", profitability: a },
      { clientId: "b", profitability: b },
    ]);
    expect(fixed(s.mrr)).toBe("400.00");
    expect(fixed(s.arr)).toBe("4800.00");
    expect(fixed(s.monthlyDirectCosts)).toBe("220.00");
    expect(fixed(s.monthlyProfit)).toBe("180.00");
    expect(roundPercent(s.margin!).toFixed(1)).toBe("45.0"); // 180 / 400
    expect(roundPercent(s.averageClientMargin!).toFixed(1)).toBe("56.7"); // (80% + 33.3%) / 2
    expect(roundPercent(s.profitContribution.get("a")!).toFixed(1)).toBe("44.4");
    expect(roundPercent(s.profitContribution.get("b")!).toFixed(1)).toBe("55.6");
  });

  it("handles an empty portfolio", () => {
    const s = summarizePortfolio([]);
    expect(fixed(s.mrr)).toBe("0.00");
    expect(s.margin).toBeNull();
  });
});

describe("monthly timeline", () => {
  it("prorates partial months, books one-time amounts in their month and includes labour", () => {
    const { lines, labour } = buildClientLines({
      services: [
        service({ name: "retainer", sellingPrice: "300", startDate: d("2026-06-16") }),
        service({ name: "build", sellingPrice: "2000", billingInterval: "ONE_TIME", startDate: d("2026-07-03") }),
      ],
      timeEntries: [{ date: d("2026-07-20"), hours: "4", hourlyCost: "50" }],
    });
    const [may, jun, jul] = calculateMonthlyTimeline(lines, labour, { year: 2026, month: 5 }, 3);
    expect(may!.month).toBe("2026-05");
    expect(fixed(may!.revenue)).toBe("0.00");
    expect(fixed(jun!.revenue)).toBe("150.00"); // 15 of 30 days
    expect(fixed(jul!.revenue)).toBe("2300.00");
    expect(fixed(jul!.labour)).toBe("200.00");
    expect(fixed(jul!.profit)).toBe("2100.00");
  });

  it("crosses year boundaries", () => {
    const pts = calculateMonthlyTimeline([], [], { year: 2025, month: 11 }, 3);
    expect(pts.map((p) => p.month)).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(utcDate(2026, 0, 1).toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("summarizeBySource", () => {
  it("gives per-record run-rate figures and the active domain cost phase", () => {
    const lines = [
      ...domainToLines({
        id: "dom", domain: "new.nl", purchaseCost: "5", renewalCost: "15", sellingPrice: "24",
        registeredAt: d("2026-01-15"), renewalDate: d("2027-01-15"), status: "ACTIVE", cancelledAt: null,
      }),
      ...serviceToLines(service({ id: "svc", sellingPrice: "300", billingInterval: "QUARTERLY", supplierCost: "60" })),
    ];
    const byYear1 = summarizeBySource(lines, ASOF);
    expect(fixed(byYear1.get("dom")!.annualProfit)).toBe("19.00");
    expect(byYear1.get("dom")!.costPhase).toBe("FIRST_YEAR");
    expect(fixed(byYear1.get("svc")!.monthlyProfit)).toBe("80.00");

    const byYear2 = summarizeBySource(lines, d("2027-02-01"));
    expect(fixed(byYear2.get("dom")!.annualCosts)).toBe("15.00");
    expect(byYear2.get("dom")!.costPhase).toBe("RENEWAL");
  });
});
