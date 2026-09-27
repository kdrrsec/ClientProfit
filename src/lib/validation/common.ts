import { z } from "zod";
import { msg } from "@/i18n/translate";

/** Form values arrive as strings; empty inputs become undefined. */
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const optionalText = (max = 500) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional()).transform((v) => v ?? null);

export const requiredText = (max = 200) =>
  z.string({ error: msg("err.required") }).trim().min(1, msg("err.required")).max(max, msg("err.tooLong", { max }));

/**
 * Money as an exact decimal string (never a float). Accepts "12,50" and
 * "12.50"; thousands separators are not accepted to avoid ambiguity.
 */
export const money = () =>
  z
    .string({ error: msg("err.required") })
    .trim()
    .transform((v) => v.replace(",", "."))
    .pipe(
      z
        .string()
        .min(1, msg("err.required"))
        .regex(/^\d{1,10}(\.\d{1,2})?$/, msg("err.money")),
    );

export const hours = z
  .string({ error: msg("err.required") })
  .trim()
  .transform((v) => v.replace(",", "."))
  .pipe(z.string().regex(/^\d{1,2}(\.\d{1,2})?$/, msg("err.hoursFormat")))
  .refine((v) => Number(v) > 0 && Number(v) <= 24, msg("err.hoursRange"));

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

/** HTML date input (YYYY-MM-DD) → UTC-midnight Date, matching Postgres DATE columns. */
export const date = () =>
  z
    .string({ error: msg("err.required") })
    .trim()
    .min(1, msg("err.required"))
    .transform((v, ctx) => {
      const d = parseIsoDate(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: msg("err.date") });
        return z.NEVER;
      }
      return d;
    });

export const optionalDate = () =>
  z.preprocess(emptyToUndefined, date().optional()).transform((v) => v ?? null);

/** Unchecked checkboxes are absent from FormData. */
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const id = z.string().min(1).max(64);

export function endNotBeforeStart<T extends { startDate: Date; endDate: Date | null }>(v: T, ctx: z.RefinementCtx) {
  if (v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: msg("err.endBeforeStart") });
  }
}
