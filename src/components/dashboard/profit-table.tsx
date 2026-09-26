import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientProfitRow } from "@/server/services/dashboard";
import { ClientStatusBadge, MarginStatusBadge } from "./status-badges";

export function ProfitTable({ rows, currency }: { rows: ClientProfitRow[]; currency: string }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No clients yet.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Costs</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="text-right">Margin</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="hover:bg-muted/50">
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(r.revenue, currency)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(r.costs, currency)}</TableCell>
            <TableCell className={cn("text-right font-medium tabular-nums", r.profit.isNegative() && "text-critical")}>
              {formatMoney(r.profit, currency)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatPercent(r.margin)}</TableCell>
            <TableCell>
              <div className="flex gap-1.5">
                <MarginStatusBadge status={r.marginStatus} />
                {r.clientStatus !== "ACTIVE" && <ClientStatusBadge status={r.clientStatus} />}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
