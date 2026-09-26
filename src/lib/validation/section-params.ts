import { z } from "zod";
import { CostCategory, DomainStatus } from "@/generated/prisma/enums";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const text = z.preprocess(first, z.string().trim().max(100).optional()).catch(undefined);
const id = z.preprocess(first, z.string().regex(/^[a-z0-9]{1,64}$/i).optional()).catch(undefined);
const isoDate = z
  .preprocess(first, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional())
  .catch(undefined)
  .transform((v) => (v && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) ? new Date(`${v}T00:00:00Z`) : undefined));

/** Lenient parsers: invalid params fall back to "no filter". */
export const commonSectionParams = z.object({
  q: text,
  client: id,
  new: z.preprocess(first, z.literal("1").optional()).catch(undefined),
  edit: id,
});

export const domainParams = commonSectionParams.extend({
  status: z.preprocess(first, z.enum(DomainStatus).optional()).catch(undefined),
  renewal: z.preprocess(first, z.enum(["7", "30", "90"]).optional()).catch(undefined),
});

export const costParams = commonSectionParams.extend({
  category: z.preprocess(first, z.enum(CostCategory).optional()).catch(undefined),
});

export const timeParams = commonSectionParams.extend({
  from: isoDate,
  to: isoDate,
  page: z.preprocess(first, z.coerce.number().int().min(1).default(1)).catch(1),
});

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
