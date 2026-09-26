import type Decimal from "decimal.js";
import { formatMoney } from "@/lib/format";
import { BILLING_INTERVAL_SUFFIX } from "@/lib/labels";
import type { BillingInterval } from "@/lib/profitability";

export function AmountPer({ amount, interval, currency }: { amount: Decimal; interval: BillingInterval; currency: string }) {
  return (
    <span className="tabular-nums">
      {formatMoney(amount, currency)} <span className="text-xs text-muted-foreground">{BILLING_INTERVAL_SUFFIX[interval]}</span>
    </span>
  );
}
