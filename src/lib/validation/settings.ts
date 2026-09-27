import { z } from "zod";
import { BillingInterval } from "@/generated/prisma/enums";
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
const percent = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .transform((v) => v.replace(",", "."))
    .pipe(z.string().regex(/^-?\d{1,3}(\.\d{1,2})?$/, `${label} must be a percentage like 30 or 12.5`))
    .refine((v) => Number(v) >= -100 && Number(v) <= 100, `${label} must be between -100 and 100`);

export const settingsSchema = z
  .object({
    name: requiredText("Company name", 100),
    logoUrl: optionalText(500).pipe(
      z.union([z.null(), z.url("Enter a valid https URL").refine((u) => u.startsWith("https://"), "Logo URL must start with https://")]),
    ),
    currency: z.enum(CURRENCIES),
    timezone: z.string().trim().refine(isTimeZone, "Unknown timezone"),
    defaultHourlyCost: money("Default internal hourly cost"),
    lowMarginThreshold: percent("Low margin threshold"),
    negativeMarginThreshold: percent("Negative margin threshold"),
    labourWindowMonths: z.coerce.number({ error: "Enter a number of months" }).int("Use whole months").min(1, "At least 1 month").max(12, "At most 12 months"),
    defaultBillingInterval: z.enum(BillingInterval),
  })
  .superRefine((v, ctx) => {
    if (Number(v.lowMarginThreshold) < Number(v.negativeMarginThreshold)) {
      ctx.addIssue({ code: "custom", path: ["lowMarginThreshold"], message: "Low margin threshold must be at least the negative margin threshold" });
    }
  });

export type SettingsInput = z.infer<typeof settingsSchema>;
