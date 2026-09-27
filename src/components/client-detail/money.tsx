import type Decimal from "decimal.js";
import { getI18n } from "@/i18n/server";
import { formatMoney } from "@/lib/format";
import type { BillingInterval } from "@/lib/profitability";

export async function AmountPer({ amount, interval, currency }: { amount: Decimal; interval: BillingInterval; currency: string }) {
  const { t } = await getI18n();
  return (
    <span className="tabular-nums">
      {formatMoney(amount, currency)} <span className="text-xs text-muted-foreground">{t(`intervalSuffix.${interval}`)}</span>
    </span>
  );
}
