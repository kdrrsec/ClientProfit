import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getI18n } from "@/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { sum, type LineSource } from "@/lib/profitability";
import type { LineView } from "@/server/services/clients";
import { AmountPer } from "./money";
import { tabHref, type ClientTab } from "./tabs";

const SOURCE_TAB: Record<LineSource, ClientTab> = { SERVICE: "services", DOMAIN: "domains", HOSTING: "hosting", COST: "costs" };

const STATE_VARIANT: Record<LineView["state"], "positive" | "neutral"> = { active: "positive", upcoming: "neutral", "one-time": "neutral", ended: "neutral" };

/** Engine lines (one per revenue or cost component) with their normalised equivalents. */
export async function LinesTable({ clientId, lines, currency, totalLabel }: { clientId: string; lines: LineView[]; currency: string; totalLabel: string }) {
  const { t, locale } = await getI18n();
  const active = lines.filter((l) => l.state === "active");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("col.item")}</TableHead>
          <TableHead>{t("col.source")}</TableHead>
          <TableHead className="text-right">{t("col.amount")}</TableHead>
          <TableHead className="text-right">{t("col.monthlyEquiv")}</TableHead>
          <TableHead className="text-right">{t("col.yearlyEquiv")}</TableHead>
          <TableHead>{t("col.period")}</TableHead>
          <TableHead>{t("table.status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((v, i) => {
          const recurring = v.line.interval !== "ONE_TIME";
          return (
            <TableRow key={`${v.line.sourceId}-${i}`} className={v.state === "ended" ? "text-muted-foreground" : undefined}>
              <TableCell className="font-medium">
                {v.line.label}
                {v.line.phase === "FIRST_YEAR" && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("common.first")}</span>}
                {v.line.phase === "RENEWAL" && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("common.renewal")}</span>}
              </TableCell>
              <TableCell>
                <Link href={tabHref(clientId, SOURCE_TAB[v.line.source])} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                  {t(`lineSource.${v.line.source}`)}
                </Link>
              </TableCell>
              <TableCell className="text-right"><AmountPer amount={v.line.amount} interval={v.line.interval} currency={currency} /></TableCell>
              <TableCell className="text-right tabular-nums">{recurring ? formatMoney(v.monthly, currency) : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{recurring ? formatMoney(v.yearly, currency) : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {recurring ? (v.line.endDate ? t("period.range", { from: formatDate(v.line.startDate, locale), to: formatDate(v.line.endDate, locale) }) : t("period.since", { from: formatDate(v.line.startDate, locale) })) : formatDate(v.line.startDate, locale)}
              </TableCell>
              <TableCell>
                <Badge variant={STATE_VARIANT[v.state]}>{t(`recordState.${v.state}`)}</Badge>
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
