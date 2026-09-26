import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { MarginStatusBadge } from "@/components/dashboard/status-badges";
import { sectionHref } from "@/components/sections/section-href";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProfitRow, ProfitSort, ProfitTotals } from "@/server/services/profitability-table";

type Current = { sort: ProfitSort; dir: "asc" | "desc" };
type Base = Record<string, string | undefined>;

const COLUMNS: { sort: ProfitSort; label: string; title?: string }[] = [
  { sort: "mrr", label: "MRR" },
  { sort: "costs", label: "Direct costs / mo" },
  { sort: "labour", label: "Labour / mo" },
  { sort: "hours", label: "Hours / mo", title: "Average hours per month over the labour window" },
  { sort: "profit", label: "Profit / mo" },
  { sort: "margin", label: "Margin" },
  { sort: "annualRevenue", label: "Annual revenue" },
  { sort: "annualProfit", label: "Annual profit" },
  { sort: "contribution", label: "Share of profit", title: "Share of the company's total monthly profit" },
];

const hours = (h: { toFixed(n: number): string }) => h.toFixed(1).replace(".", ",");

function SortLink({ sort, label, title, current, base, align = "right" }: { sort: ProfitSort; label: string; title?: string; current: Current; base: Base; align?: "left" | "right" }) {
  const active = current.sort === sort;
  const nextDir = active ? (current.dir === "asc" ? "desc" : "asc") : sort === "name" ? "asc" : "desc";
  const Icon = current.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined} aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={sectionHref("/profitability", { ...base, sort, dir: nextDir })} title={title} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
        {label}
        {active && <Icon className="size-3" aria-hidden />}
      </Link>
    </TableHead>
  );
}

function Money({ value, currency, strong, muted }: { value: { isNegative(): boolean } & Parameters<typeof formatMoney>[0]; currency: string; strong?: boolean; muted?: boolean }) {
  return (
    <TableCell className={cn("text-right tabular-nums", strong && "font-medium", muted && "text-muted-foreground", value.isNegative() && "text-critical")}>
      {formatMoney(value, currency)}
    </TableCell>
  );
}

export function ProfitTable({ rows, totals, currency, current, base }: { rows: ProfitRow[]; totals: ProfitTotals; currency: string; current: Current; base: Base }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortLink sort="name" label="Client" current={current} base={base} align="left" />
          {COLUMNS.map((c) => (
            <SortLink key={c.sort} {...c} current={current} base={base} />
          ))}
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="relative hover:bg-muted/50">
            <TableCell>
              <Link href={`/clients/${r.id}?tab=profitability` as Route} className="font-medium after:absolute after:inset-0 focus-visible:underline focus-visible:outline-none">
                {r.name}
              </Link>
            </TableCell>
            <Money value={r.mrr} currency={currency} />
            <Money value={r.costs} currency={currency} muted />
            <Money value={r.labour} currency={currency} muted />
            <TableCell className="text-right tabular-nums text-muted-foreground">{hours(r.hours)}</TableCell>
            <Money value={r.profit} currency={currency} strong />
            <TableCell className="text-right tabular-nums">{formatPercent(r.margin)}</TableCell>
            <Money value={r.annualRevenue} currency={currency} />
            <Money value={r.annualProfit} currency={currency} />
            <TableCell className="text-right tabular-nums text-muted-foreground">{formatPercent(r.contribution)}</TableCell>
            <TableCell>
              <MarginStatusBadge status={r.marginStatus} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <tfoot>
        <TableRow className="border-t-2 font-medium">
          <TableCell>Selection total</TableCell>
          <Money value={totals.mrr} currency={currency} />
          <Money value={totals.costs} currency={currency} />
          <Money value={totals.labour} currency={currency} />
          <TableCell className="text-right tabular-nums">{hours(totals.hours)}</TableCell>
          <Money value={totals.profit} currency={currency} />
          <TableCell className="text-right tabular-nums">{formatPercent(totals.margin)}</TableCell>
          <Money value={totals.annualRevenue} currency={currency} />
          <Money value={totals.annualProfit} currency={currency} />
          <TableCell colSpan={2} />
        </TableRow>
      </tfoot>
    </Table>
  );
}
