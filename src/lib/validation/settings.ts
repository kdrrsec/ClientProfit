import { z } from "zod";
import { BillingInterval } from "@/generated/prisma/enums";
import { msg } from "@/i18n/translate";
import { money, optionalText, requiredText } from "./common";

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN"] as const;

function isTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Percentage with at most 2 decimals between -100 and 100, kept as an exact string. */
const percent = () =>
  z
    .string({ error: msg("err.required") })
    .trim()
    .transform((v) => v.replace(",", "."))
    .pipe(z.string().regex(/^-?\d{1,3}(\.\d{1,2})?$/, msg("err.percentFormat")))
    .refine((v) => Number(v) >= -100 && Number(v) <= 100, msg("err.percentRange"));

export const settingsSchema = z
  .object({
    name: requiredText(100),
    logoUrl: optionalText(500).pipe(
      z.union([z.null(), z.url(msg("err.url")).refine((u) => u.startsWith("https://"), msg("err.httpsOnly"))]),
    ),
    currency: z.enum(CURRENCIES),
    timezone: z.string().trim().refine(isTimeZone, msg("err.timezone")),
    defaultHourlyCost: money(),
    lowMarginThreshold: percent(),
    negativeMarginThreshold: percent(),
    labourWindowMonths: z.coerce.number({ error: msg("err.months") }).int(msg("err.months")).min(1, msg("err.months")).max(12, msg("err.months")),
    defaultBillingInterval: z.enum(BillingInterval),
  })
  .superRefine((v, ctx) => {
    if (Number(v.lowMarginThreshold) < Number(v.negativeMarginThreshold)) {
      ctx.addIssue({ code: "custom", path: ["lowMarginThreshold"], message: msg("err.thresholdOrder") });
    }
  });

export type SettingsInput = z.infer<typeof settingsSchema>;
