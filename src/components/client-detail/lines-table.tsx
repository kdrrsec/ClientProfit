import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { sum, type LineSource } from "@/lib/profitability";
import type { LineView } from "@/server/services/clients";
import { AmountPer } from "./money";
import { tabHref, type ClientTab } from "./tabs";

const SOURCE: Record<LineSource, { label: string; tab: ClientTab }> = {
  SERVICE: { label: "Service", tab: "services" },
  DOMAIN: { label: "Domain", tab: "domains" },
  HOSTING: { label: "Hosting", tab: "hosting" },
  COST: { label: "Other cost", tab: "costs" },
};

const STATE: Record<LineView["state"], { label: string; variant: "positive" | "neutral" }> = {
  active: { label: "Active", variant: "positive" },
  upcoming: { label: "Upcoming", variant: "neutral" },
  "one-time": { label: "One-time", variant: "neutral" },
  ended: { label: "Ended", variant: "neutral" },
};

/** Engine lines (one per revenue or cost component) with their normalised equivalents. */
export function LinesTable({ clientId, lines, currency, totalLabel }: { clientId: string; lines: LineView[]; currency: string; totalLabel: string }) {
  const active = lines.filter((l) => l.state === "active");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Monthly equiv.</TableHead>
          <TableHead className="text-right">Yearly equiv.</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((v, i) => {
          const src = SOURCE[v.line.source];
          const recurring = v.line.interval !== "ONE_TIME";
          return (
            <TableRow key={`${v.line.sourceId}-${i}`} className={v.state === "ended" ? "text-muted-foreground" : undefined}>
              <TableCell className="font-medium">
                {v.line.label}
                {v.line.phase === "FIRST_YEAR" && <span className="ml-1.5 text-xs font-normal text-muted-foreground">first year</span>}
                {v.line.phase === "RENEWAL" && <span className="ml-1.5 text-xs font-normal text-muted-foreground">renewal</span>}
              </TableCell>
              <TableCell>
                <Link href={tabHref(clientId, src.tab)} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  {src.label}
                </Link>
              </TableCell>
              <TableCell className="text-right"><AmountPer amount={v.line.amount} interval={v.line.interval} currency={currency} /></TableCell>
              <TableCell className="text-right tabular-nums">{recurring ? formatMoney(v.monthly, currency) : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{recurring ? formatMoney(v.yearly, currency) : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {recurring ? (v.line.endDate ? `${formatDate(v.line.startDate)} – ${formatDate(v.line.endDate)}` : `Since ${formatDate(v.line.startDate)}`) : formatDate(v.line.startDate)}
              </TableCell>
              <TableCell>
                <Badge variant={STATE[v.state].variant}>{STATE[v.state].label}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <tfoot>
        <TableRow className="border-t font-medium">
          <TableCell colSpan={3}>{totalLabel}</TableCell>
          <TableCell className="text-right tabular-nums">{formatMoney(sum(active.map((v) => v.monthly)), currency)}</TableCell>
          <TableCell className="text-right tabular-nums">{formatMoney(sum(active.map((v) => v.yearly)), currency)}</TableCell>
          <TableCell colSpan={2} />
        </TableRow>
      </tfoot>
    </Table>
  );
}
