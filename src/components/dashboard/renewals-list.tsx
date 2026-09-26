import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelativeDays } from "@/lib/format";
import type { RenewalItem, RenewalKind } from "@/lib/renewals";

const KIND: Record<RenewalKind, string> = {
  DOMAIN: "Domain",
  HOSTING: "Hosting",
  SERVICE: "Service ends",
  COST: "Software",
  CONTRACT: "Contract",
};

export function RenewalsList({ items }: { items: RenewalItem[] }) {
  if (items.length === 0) return <p className="py-6 text-sm text-muted-foreground">No renewals in this period.</p>;
  return (
    <ul className="divide-y">
      {items.map((r) => (
        <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{KIND[r.kind]}</Badge>
              <span className="truncate text-sm font-medium">{r.kind === "CONTRACT" ? r.clientName : r.label}</span>
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {r.kind === "CONTRACT" ? "Contract renewal" : r.clientName}
              {r.autoRenew === true && " · auto-renew on"}
              {r.autoRenew === false && " · auto-renew off"}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm tabular-nums">{formatDate(r.date)}</div>
            <div className={r.daysUntil < 0 ? "text-xs text-critical" : "text-xs text-muted-foreground"}>
              {formatRelativeDays(r.daysUntil)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
