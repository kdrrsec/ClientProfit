import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { ClientStatusBadge, MarginStatusBadge } from "@/components/dashboard/status-badges";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientSort } from "@/server/services/clients";
import type { ClientListRow } from "@/server/services/clients";

export function clientsHref(params: Record<string, string | number | undefined>): Route {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) sp.set(k, String(v));
  const qs = sp.toString();
  return (qs ? `/clients?${qs}` : "/clients") as Route;
}

function SortHeader({
  label,
  sort,
  current,
  base,
  align = "right",
}: {
  label: string;
  sort: ClientSort;
  current: { sort: ClientSort; dir: "asc" | "desc" };
  base: Record<string, string | undefined>;
  align?: "left" | "right";
}) {
  const active = current.sort === sort;
  const nextDir = active ? (current.dir === "asc" ? "desc" : "asc") : sort === "name" ? "asc" : "desc";
  const Icon = current.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined} aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={clientsHref({ ...base, sort, dir: nextDir })} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
        {label}
        {active && <Icon className="size-3" aria-hidden />}
      </Link>
    </TableHead>
  );
}

export function ClientsTable({
  rows,
  currency,
  current,
  base,
}: {
  rows: ClientListRow[];
  currency: string;
  current: { sort: ClientSort; dir: "asc" | "desc" };
  base: Record<string, string | undefined>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHeader label="Client" sort="name" current={current} base={base} align="left" />
          <TableHead>Status</TableHead>
          <SortHeader label="Revenue / mo" sort="revenue" current={current} base={base} />
          <SortHeader label="Costs / mo" sort="costs" current={current} base={base} />
          <SortHeader label="Profit / mo" sort="profit" current={current} base={base} />
          <SortHeader label="Margin" sort="margin" current={current} base={base} />
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="relative hover:bg-muted/50">
            <TableCell>
              <Link href={`/clients/${r.id}` as Route} className="font-medium after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none">
                {r.name}
              </Link>
              {(r.contactName || r.email) && (
                <div className="max-w-64 truncate text-xs text-muted-foreground">{[r.contactName, r.email].filter(Boolean).join(" · ")}</div>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1.5">
                <ClientStatusBadge status={r.status} />
                {r.archived && <Badge variant="neutral">Archived</Badge>}
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(r.revenue, currency)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(r.costs, currency)}</TableCell>
            <TableCell className={cn("text-right font-medium tabular-nums", r.profit.isNegative() && "text-critical")}>{formatMoney(r.profit, currency)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatPercent(r.margin)}</TableCell>
            <TableCell>
              <MarginStatusBadge status={r.marginStatus} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
