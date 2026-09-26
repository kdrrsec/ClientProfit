import { z } from "zod";
import { BillingInterval, ClientStatus, CostCategory, DomainStatus, ServiceType } from "@/generated/prisma/enums";
import { checkbox, date, endNotBeforeStart, hours, money, optionalDate, optionalText, requiredText } from "./common";

const url = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" && !/^https?:\/\//i.test(v.trim()) ? `https://${v.trim()}` : v),
  optionalText(300).pipe(z.union([z.null(), z.url("Enter a valid website").max(300)])),
);

export const clientSchema = z
  .object({
    companyName: requiredText("Company name"),
    contactName: optionalText(200),
    email: optionalText(200).pipe(z.union([z.null(), z.email("Enter a valid email address")])),
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
    startDate: optionalDate("Start date"),
    contractRenewalDate: optionalDate("Contract renewal date"),
    notes: optionalText(5000),
  });
export type ClientInput = z.infer<typeof clientSchema>;

export const notesSchema = z.object({ notes: optionalText(5000) });

export const serviceSchema = z
  .object({
    name: requiredText("Name"),
    type: z.enum(ServiceType),
    description: optionalText(1000),
    billingInterval: z.enum(BillingInterval),
    sellingPrice: money("Selling price"),
    supplier: optionalText(200),
    supplierCost: money("Supplier cost"),
    costInterval: z.preprocess((v) => (v === "" || v === "SAME" ? null : v), z.enum(BillingInterval).nullable()),
    startDate: date("Start date"),
    endDate: optionalDate("End date"),
    isActive: checkbox,
  })
  .superRefine(endNotBeforeStart);
export type ServiceInput = z.infer<typeof serviceSchema>;

export const domainSchema = z
  .object({
    domain: requiredText("Domain", 253)
      .toLowerCase()
      .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter a domain like example.nl"),
    registrar: optionalText(200),
    purchaseCost: money("Purchase cost"),
    renewalCost: money("Renewal cost"),
    sellingPrice: money("Selling price"),
    registeredAt: date("Registration date"),
    renewalDate: date("Renewal date"),
    autoRenew: checkbox,
    status: z.enum(DomainStatus),
    cancelledAt: optionalDate("Cancellation date"),
    notes: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.renewalDate < v.registeredAt) ctx.addIssue({ code: "custom", path: ["renewalDate"], message: "Renewal date is before registration" });
  });
export type DomainInput = z.infer<typeof domainSchema>;

export const hostingSchema = z
  .object({
    product: requiredText("Product"),
    provider: optionalText(200),
    server: optionalText(200),
    billingInterval: z.enum(BillingInterval).exclude(["ONE_TIME"]),
    purchaseCost: money("Purchase cost"),
    sellingPrice: money("Selling price"),
    startDate: date("Start date"),
    endDate: optionalDate("End date"),
    renewalDate: optionalDate("Renewal date"),
    notes: optionalText(2000),
  })
  .superRefine(endNotBeforeStart);
export type HostingInput = z.infer<typeof hostingSchema>;

export const costSchema = z
  .object({
    name: requiredText("Name"),
    category: z.enum(CostCategory),
    amount: money("Amount"),
    billingInterval: z.enum(BillingInterval),
    startDate: date("Start date"),
    endDate: optionalDate("End date"),
    renewalDate: optionalDate("Renewal date"),
    notes: optionalText(2000),
  })
  .superRefine(endNotBeforeStart);
export type CostInput = z.infer<typeof costSchema>;

export const timeEntrySchema = z.object({
  date: date("Date"),
  description: requiredText("Description", 500),
  hours,
  hourlyCost: money("Internal hourly cost"),
});
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
