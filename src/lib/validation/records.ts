import { z } from "zod";
import { msg } from "@/i18n/translate";
import { BillingInterval, ClientStatus, CostCategory, DomainStatus, ServiceType } from "@/generated/prisma/enums";
import { checkbox, date, endNotBeforeStart, hours, money, optionalDate, optionalText, requiredText } from "./common";

const url = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" && !/^https?:\/\//i.test(v.trim()) ? `https://${v.trim()}` : v),
  optionalText(300).pipe(z.union([z.null(), z.url(msg("err.website")).max(300)])),
);

export const clientSchema = z
  .object({
    companyName: requiredText(),
    contactName: optionalText(200),
    email: optionalText(200).pipe(z.union([z.null(), z.email(msg("err.email"))])),
    phone: optionalText(50),
    website: url,
    addressLine1: optionalText(200),
    addressLine2: optionalText(200),
    postalCode: optionalText(20),
    city: optionalText(100),
    country: optionalText(2),
    vatNumber: optionalText(30),
    chamberOfCommerce: optionalText(20),
    status: z.enum(ClientStatus),
    startDate: optionalDate(),
    contractRenewalDate: optionalDate(),
    notes: optionalText(5000),
  });
export type ClientInput = z.infer<typeof clientSchema>;

/** Money that may be left empty (counts as 0; the attention list then asks for it). */
const optionalMoney = () => z.preprocess((v) => (v === undefined || (typeof v === "string" && v.trim() === "") ? "0" : v), money());

/** Quick add: a client plus, optionally, the domain of the site you manage for them. */
export const quickClientSchema = z.object({
  companyName: requiredText(),
  domain: optionalText(300),
  manageDomain: checkbox,
  registrar: optionalText(200),
  registeredAt: optionalDate(),
  renewalDate: optionalDate(),
  sellingPrice: optionalMoney(),
  renewalCost: optionalMoney(),
});
export type QuickClientInput = z.infer<typeof quickClientSchema>;

export const notesSchema = z.object({ notes: optionalText(5000) });

export const serviceSchema = z
  .object({
    name: requiredText(),
    type: z.enum(ServiceType),
    description: optionalText(1000),
    billingInterval: z.enum(BillingInterval),
    sellingPrice: money(),
    supplier: optionalText(200),
    supplierCost: money(),
    costInterval: z.preprocess((v) => (v === "" || v === "SAME" ? null : v), z.enum(BillingInterval).nullable()),
    startDate: date(),
    endDate: optionalDate(),
    isActive: checkbox,
  })
  .superRefine(endNotBeforeStart);
export type ServiceInput = z.infer<typeof serviceSchema>;

export const domainSchema = z
  .object({
    domain: requiredText(253)
      .toLowerCase()
      .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, msg("err.domainFormat")),
    registrar: optionalText(200),
    purchaseCost: money(),
    renewalCost: money(),
    sellingPrice: money(),
    registeredAt: date(),
    renewalDate: date(),
    autoRenew: checkbox,
    status: z.enum(DomainStatus),
    cancelledAt: optionalDate(),
    notes: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.renewalDate < v.registeredAt) ctx.addIssue({ code: "custom", path: ["renewalDate"], message: msg("err.renewalBeforeRegistration") });
  });
export type DomainInput = z.infer<typeof domainSchema>;

export const hostingSchema = z
  .object({
    product: requiredText(),
    provider: optionalText(200),
    server: optionalText(200),
    billingInterval: z.enum(BillingInterval).exclude(["ONE_TIME"]),
    purchaseCost: money(),
    sellingPrice: money(),
    startDate: date(),
    endDate: optionalDate(),
    renewalDate: optionalDate(),
    notes: optionalText(2000),
  })
  .superRefine(endNotBeforeStart);
export type HostingInput = z.infer<typeof hostingSchema>;

export const costSchema = z
  .object({
    name: requiredText(),
    category: z.enum(CostCategory),
    amount: money(),
    billingInterval: z.enum(BillingInterval),
    startDate: date(),
    endDate: optionalDate(),
    renewalDate: optionalDate(),
    notes: optionalText(2000),
  })
  .superRefine(endNotBeforeStart);
export type CostInput = z.infer<typeof costSchema>;

export const timeEntrySchema = z.object({
  date: date(),
  description: requiredText(500),
  hours,
  hourlyCost: money(),
});
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
