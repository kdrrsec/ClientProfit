import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { getI18n } from "@/i18n/server";
import type { T } from "@/i18n/translate";
import type { AttentionItem, AttentionSeverity } from "@/lib/attention";
import { formatPercent, formatRelativeDays } from "@/lib/format";

const ICON: Record<AttentionSeverity, { Icon: typeof Info; className: string }> = {
  critical: { Icon: AlertCircle, className: "text-critical" },
  warning: { Icon: AlertTriangle, className: "text-warning" },
  info: { Icon: Info, className: "text-muted-foreground" },
};

function describe(item: AttentionItem, t: T): string {
  return t(`attention.${item.code}`, {
    margin: formatPercent(item.margin ?? null),
    share: formatPercent(item.labourShare ?? null),
    subject: item.subject ?? "",
    when: formatRelativeDays(item.daysUntil ?? 0, t),
  });
}

export async function AttentionList({ items }: { items: AttentionItem[] }) {
  const { t } = await getI18n();
  if (items.length === 0) return <p className="py-6 text-sm text-muted-foreground">{t("attention.empty")}</p>;
  return (
    <ul className="divide-y">
      {items.map((item, i) => {
        const { Icon, className } = ICON[item.severity];
        return (
          <li key={`${item.code}-${item.clientId}-${item.subject ?? ""}-${i}`} className="flex items-start gap-3 py-2.5">
            <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} aria-label={t(`severity.${item.severity}`)} />
            <div className="min-w-0">
              <div className="text-sm">{describe(item, t)}</div>
              <div className="text-xs text-muted-foreground">{item.clientName}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
