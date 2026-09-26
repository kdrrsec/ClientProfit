import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { AttentionItem, AttentionSeverity } from "@/lib/attention";
import { formatPercent, formatRelativeDays } from "@/lib/format";

const ICON: Record<AttentionSeverity, { Icon: typeof Info; className: string; label: string }> = {
  critical: { Icon: AlertCircle, className: "text-critical", label: "Critical" },
  warning: { Icon: AlertTriangle, className: "text-warning", label: "Warning" },
  info: { Icon: Info, className: "text-muted-foreground", label: "Info" },
};

function describe(item: AttentionItem): string {
  switch (item.code) {
    case "NEGATIVE_MARGIN":
      return `Negative margin (${formatPercent(item.margin ?? null)})`;
    case "LOW_MARGIN":
      return `Low margin (${formatPercent(item.margin ?? null)})`;
    case "HIGH_LABOUR_LOW_MARGIN":
      return `Labour is ${formatPercent(item.labourShare ?? null)} of revenue; margin ${formatPercent(item.margin ?? null)}`;
    case "COSTS_WITHOUT_REVENUE":
      return "Has costs but no recurring revenue";
    case "MISSING_SELLING_PRICE":
      return `No selling price for ${item.subject}`;
    case "MISSING_COST":
      return `No cost recorded for ${item.subject}`;
    case "DOMAIN_OVERDUE":
      return `Domain ${item.subject} renewal ${formatRelativeDays(item.daysUntil ?? 0)}`;
    case "DOMAIN_EXPIRING":
      return `Domain ${item.subject} renews ${formatRelativeDays(item.daysUntil ?? 0)}`;
    case "HOSTING_RENEWAL":
      return `Hosting ${item.subject} renews ${formatRelativeDays(item.daysUntil ?? 0)}`;
  }
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return <p className="py-6 text-sm text-muted-foreground">Nothing needs attention.</p>;
  return (
    <ul className="divide-y">
      {items.map((item, i) => {
        const { Icon, className, label } = ICON[item.severity];
        return (
          <li key={`${item.code}-${item.clientId}-${item.subject ?? ""}-${i}`} className="flex items-start gap-3 py-2.5">
            <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} aria-label={label} />
            <div className="min-w-0">
              <div className="text-sm">{describe(item)}</div>
              <div className="text-xs text-muted-foreground">{item.clientName}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
