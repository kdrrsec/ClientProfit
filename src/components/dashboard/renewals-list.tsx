import { Badge } from "@/components/ui/badge";
import { getI18n } from "@/i18n/server";
import { formatDate, formatRelativeDays } from "@/lib/format";
import type { RenewalItem } from "@/lib/renewals";

export async function RenewalsList({ items }: { items: RenewalItem[] }) {
  const { t, locale } = await getI18n();
  if (items.length === 0) return <p className="py-6 text-sm text-muted-foreground">{t("renewals.none")}</p>;
  return (
    <ul className="divide-y">
      {items.map((r) => (
        <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{t(`renewalKind.${r.kind}`)}</Badge>
              <span className="truncate text-sm font-medium">{r.kind === "CONTRACT" ? r.clientName : r.label}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {r.kind === "CONTRACT" ? t("renewals.contractRenewal") : r.clientName}
              {r.autoRenew === true && ` · ${t("renewals.autoRenewOn")}`}
              {r.autoRenew === false && ` · ${t("renewals.autoRenewOff")}`}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm tabular-nums">{formatDate(r.date, locale)}</div>
            <div className={r.daysUntil < 0 ? "text-xs text-critical" : "text-xs text-muted-foreground"}>{formatRelativeDays(r.daysUntil, t)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
