import { z } from "zod";

/** Form values arrive as strings; empty inputs become undefined. */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optionalText = (max = 500) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional()).transform((v) => v ?? null);

export const requiredText = (label: string, max = 200) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

/**
 * Money as an exact decimal string (never a float). Accepts "12,50" and
 * "12.50"; thousands separators are not accepted to avoid ambiguity.
 */
export const money = (label = "Amount") =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .transform((v) => v.replace(",", "."))
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .regex(/^\d{1,10}(\.\d{1,2})?$/, `${label} must be a positive amount with at most 2 decimals`),
    );

export const hours = z
  .string({ error: "Hours are required" })
  .trim()
  .transform((v) => v.replace(",", "."))
  .pipe(z.string().regex(/^\d{1,2}(\.\d{1,2})?$/, "Enter hours like 1.5"))
  .refine((v) => Number(v) > 0 && Number(v) <= 24, "Hours must be between 0 and 24");

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

/** HTML date input (YYYY-MM-DD) → UTC-midnight Date, matching Postgres DATE columns. */
export const date = (label = "Date") =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .transform((v, ctx) => {
      const d = parseIsoDate(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: `${label} is not a valid date` });
        return z.NEVER;
      }
      return d;
    });

export const optionalDate = (label = "Date") =>
  z.preprocess(emptyToUndefined, date(label).optional()).transform((v) => v ?? null);

/** Unchecked checkboxes are absent from FormData. */
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const id = z.string().min(1).max(64);

export function endNotBeforeStart<T extends { startDate: Date; endDate: Date | null }>(v: T, ctx: z.RefinementCtx) {
  if (v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date is before start date" });
  }
}
