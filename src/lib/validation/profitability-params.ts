import { z } from "zod";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const profitabilityParams = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  view: z.preprocess(first, z.enum(["all", "active", "negative", "low"]).default("all")).catch("all"),
  sort: z
    .preprocess(first, z.enum(["name", "mrr", "costs", "labour", "hours", "profit", "margin", "annualRevenue", "annualProfit", "contribution"]).default("profit"))
    .catch("profit"),
  dir: z.preprocess(first, z.enum(["asc", "desc"]).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).default(1)).catch(1),
});
