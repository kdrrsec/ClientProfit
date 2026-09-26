import { z } from "zod";
import { ClientStatus } from "@/generated/prisma/enums";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

/** Lenient: invalid params fall back to defaults instead of erroring. */
export const clientListParams = z.object({
  q: z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined),
  status: z.preprocess(first, z.union([z.enum(ClientStatus), z.literal("ARCHIVED")]).optional()).catch(undefined),
  sort: z.preprocess(first, z.enum(["profit", "revenue", "costs", "margin", "name"]).default("profit")).catch("profit"),
  dir: z.preprocess(first, z.enum(["asc", "desc"]).optional()).catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).default(1)).catch(1),
});
export type ClientListParams = z.infer<typeof clientListParams>;
