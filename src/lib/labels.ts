import type { BillingInterval, ClientStatus, CostCategory, DomainStatus, ServiceType } from "@/generated/prisma/enums";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  LEAD: "Lead",
  ACTIVE: "Active",
  PAUSED: "Paused",
  CHURNED: "Churned",
};

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  ONE_TIME: "One-time",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

/** Suffix used after an amount, e.g. "€ 89,00 / month". */
export const BILLING_INTERVAL_SUFFIX: Record<BillingInterval, string> = {
  ONE_TIME: "one-time",
  MONTHLY: "/ month",
  QUARTERLY: "/ quarter",
  YEARLY: "/ year",
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  WEBSITE: "Website",
  HOSTING: "Hosting",
  MAINTENANCE: "Maintenance",
  DOMAIN: "Domain",
  SEO: "SEO",
  MARKETING: "Marketing",
  SUPPORT: "Support",
  DEVELOPMENT: "Development",
  LICENSE: "Licence",
  OTHER: "Other",
};

export const DOMAIN_STATUS_LABELS: Record<DomainStatus, string> = {
  ACTIVE: "Active",
  EXPIRING: "Expiring",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  SOFTWARE: "Software",
  PLUGIN: "Plugin",
  API: "API",
  STOCK_MEDIA: "Stock media",
  EMAIL: "Email service",
  SAAS: "SaaS subscription",
  FREELANCER: "External freelancer",
  SERVER: "Server",
  TOOLING: "Maintenance tool",
  OTHER: "Other",
};

export function options<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
