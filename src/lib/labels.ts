import type { MessageKey } from "@/i18n/messages/en";
import type { T } from "@/i18n/translate";

/** Enum values in display order. Their labels live in the i18n messages as `<group>.<VALUE>`. */
export const CLIENT_STATUSES = ["LEAD", "ACTIVE", "PAUSED", "CHURNED"] as const;
export const BILLING_INTERVALS = ["ONE_TIME", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export const SERVICE_TYPES = ["WEBSITE", "HOSTING", "MAINTENANCE", "DOMAIN", "SEO", "MARKETING", "SUPPORT", "DEVELOPMENT", "LICENSE", "OTHER"] as const;
export const DOMAIN_STATUSES = ["ACTIVE", "EXPIRING", "EXPIRED", "CANCELLED"] as const;
export const COST_CATEGORIES = ["SOFTWARE", "PLUGIN", "API", "STOCK_MEDIA", "EMAIL", "SAAS", "FREELANCER", "SERVER", "TOOLING", "OTHER"] as const;

type Group = "clientStatus" | "interval" | "serviceType" | "domainStatus" | "costCategory";

/** Translated `<option>`s for an enum. */
export function enumOptions<V extends string>(t: T, group: Group, values: readonly V[]): { value: V; label: string }[] {
  return values.map((value) => ({ value, label: t(`${group}.${value}` as MessageKey) }));
}
