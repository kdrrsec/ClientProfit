import { Money, type Money as MoneyT } from "./money";

export const BILLING_INTERVALS = ["ONE_TIME", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** How many times per year an amount on this interval is charged. */
const PERIODS_PER_YEAR: Record<Exclude<BillingInterval, "ONE_TIME">, number> = {
  MONTHLY: 12,
  QUARTERLY: 4,
  YEARLY: 1,
};

export function isRecurring(interval: BillingInterval): interval is Exclude<BillingInterval, "ONE_TIME"> {
  return interval !== "ONE_TIME";
}

/**
 * Yearly equivalent of a recurring amount. One-time amounts have no recurring
 * equivalent and return 0. Yearly is the canonical base: it is always exact
 * (monthly × 12, quarterly × 4), whereas monthly equivalents can repeat
 * (e.g. €100/quarter = €33.333…/month).
 */
export function toYearly(amount: MoneyT, interval: BillingInterval): MoneyT {
  if (!isRecurring(interval)) return new Money(0);
  return amount.times(PERIODS_PER_YEAR[interval]);
}

/** Monthly equivalent: monthly = amount, quarterly = amount / 3, yearly = amount / 12. */
export function toMonthly(amount: MoneyT, interval: BillingInterval): MoneyT {
  return toYearly(amount, interval).dividedBy(12);
}
