import type Decimal from "decimal.js";
import { AttentionList } from "@/components/dashboard/attention-list";
import { RenewalsList } from "@/components/dashboard/renewals-list";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { MarginStatusBadge } from "@/components/dashboard/status-badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatHours, formatMoney, formatPercent } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";
import type { ClientDetail } from "@/server/services/clients";
import { LinesTable } from "./lines-table";
import { NotesForm } from "./notes-form";
import { OtherCostsSection, type TabMode } from "./record-tabs";
import { Empty, Section } from "./section";

type Props = { detail: ClientDetail };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 min-w-0 break-words">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

/** The calculation, written out: revenue − direct costs − labour = profit. */
export async function ProfitBreakdown({ detail, compact }: Props & { compact?: boolean }) {
  const { profitability: p, settings } = detail;
  const c = settings.currency;
  const { t } = await getI18n();
  const row = (label: string, m: Decimal, y: Decimal, opts: { sign?: "−" | "="; strong?: boolean } = {}) => (
    <TableRow className={cn(opts.strong && "font-semibold", opts.sign === "=" && "border-t-2")}>
      <TableCell>
        <span className="inline-block w-4 text-muted-foreground">{opts.sign ?? ""}</span>
        {label}
      </TableCell>
      <TableCell className={cn("text-right tabular-nums", m.isNegative() && "text-critical")}>{formatMoney(m, c)}</TableCell>
      {!compact && <TableCell className={cn("text-right tabular-nums", y.isNegative() && "text-critical")}>{formatMoney(y, c)}</TableCell>}
    </TableRow>
  );
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead />
          <TableHead className="text-right">{t("breakdown.monthly")}</TableHead>
          {!compact && <TableHead className="text-right">{t("breakdown.yearly")}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {row(t("breakdown.revenue"), p.monthly.revenue, p.annual.revenue)}
        {row(t("breakdown.directCosts"), p.monthly.directCosts, p.annual.directCosts, { sign: "−" })}
        {row(t("breakdown.labour"), p.monthly.labour, p.annual.labour, { sign: "−" })}
        {row(t("breakdown.grossProfit"), p.monthly.profit, p.annual.profit, { sign: "=", strong: true })}
        <TableRow>
          <TableCell>
            <span className="inline-block w-4" />
            {t("breakdown.margin")}
          </TableCell>
          <TableCell className="text-right whitespace-normal tabular-nums" colSpan={compact ? 1 : 2}>
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
              {formatPercent(p.margin)}
              <MarginStatusBadge status={p.status} />
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export async function OverviewTab({ detail }: Props) {
  const { client, settings } = detail;
  const { t, locale } = await getI18n();
  const address = [client.addressLine1, client.addressLine2, [client.postalCode, client.city].filter(Boolean).join(" "), client.country]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="min-w-0 space-y-6 lg:col-span-3">
        <Section title={t("overview.profitability")} description={t("overview.profitabilityDesc")}>
          <ProfitBreakdown detail={detail} compact />
        </Section>
        <Section title={t("dashboard.attention")}>
          <AttentionList items={detail.attention} />
        </Section>
      </div>
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Section title={t("overview.clientDetails")}>
          <dl className="divide-y">
            <Detail label={t("field.status")}>{t(`clientStatus.${client.status}`)}</Detail>
            <Detail label={t("detail.contact")}>{client.contactName}</Detail>
            <Detail label={t("field.email")}>{client.email && <a className="underline-offset-4 hover:underline" href={`mailto:${client.email}`}>{client.email}</a>}</Detail>
            <Detail label={t("field.phone")}>{client.phone}</Detail>
            <Detail label={t("field.website")}>
              {client.website && (
                <a className="underline-offset-4 hover:underline" href={client.website} target="_blank" rel="noopener noreferrer">
                  {client.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </Detail>
            <Detail label={t("field.address")}>{address || null}</Detail>
            <Detail label={t("field.vatNumber")}>{client.vatNumber}</Detail>
            <Detail label={t("field.kvk")}>{client.chamberOfCommerce}</Detail>
            <Detail label={t("field.startDate")}>{client.startDate && formatDate(client.startDate, locale)}</Detail>
            <Detail label={t("detail.contractRenewal")}>{client.contractRenewalDate && formatDate(client.contractRenewalDate, locale)}</Detail>
          </dl>
        </Section>
        <Section title={t("dashboard.upcomingRenewals")} description={t("overview.renewalsDesc", { date: formatDate(settings.today, locale) })}>
          <RenewalsList items={detail.renewals} />
        </Section>
      </div>
    </div>
  );
}

export async function RevenueTab({ detail }: Props) {
  const { t } = await getI18n();
  return (
    <Section
      title={t("tab.revenue")}
      description={t("revenueTab.description")}
      flush
    >
      {detail.revenueLines.length === 0 ? (
        <Empty>{t("revenueTab.empty")}</Empty>
      ) : (
        <LinesTable clientId={detail.client.id} lines={detail.revenueLines} currency={detail.settings.currency} totalLabel={t("revenueTab.total")} />
      )}
    </Section>
  );
}

export async function CostsTab({ detail, mode }: Props & { mode: TabMode }) {
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      <Section title={t("costsTab.allTitle")} description={t("costsTab.allDescription")} flush>
        {detail.costLines.length === 0 ? (
          <Empty>{t("costsTab.empty")}</Empty>
        ) : (
          <LinesTable clientId={detail.client.id} lines={detail.costLines} currency={detail.settings.currency} totalLabel={t("costsTab.total")} />
        )}
      </Section>
      <OtherCostsSection detail={detail} mode={mode} />
    </div>
  );
}

export async function ProfitabilityTab({ detail }: Props) {
  const { profitability: p, settings } = detail;
  const w = p.labourWindow;
  const { t, locale } = await getI18n();
  return (
    <div className="space-y-6">
      <Section title={t("profitTab.title")} description={t("profitTab.description")}>
        <ProfitBreakdown detail={detail} />
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          <li>{t("profitTab.noteRevenue", { date: formatDate(settings.today, locale) })}</li>
          <li>
            {t("profitTab.noteLabour", {
              hours: formatHours(w.hours),
              cost: formatMoney(w.cost, settings.currency),
              from: formatDate(w.from, locale),
              to: formatDate(w.to, locale),
              months: w.months.toDecimalPlaces(1).toString().replace(".", ","),
            })}
          </li>
          <li>{t("profitTab.noteYearly")}</li>
        </ul>
      </Section>
      <Section title={t("dashboard.revenueVsCosts")} description={t("profitTab.chartDescription")}>
        <RevenueChart data={detail.timeline} currency={settings.currency} />
      </Section>
    </div>
  );
}

export async function NotesTab({ detail }: Props) {
  const { t } = await getI18n();
  return (
    <Section title={t("notes.title")} description={t("notes.description")}>
      <NotesForm clientId={detail.client.id} notes={detail.client.notes ?? ""} />
    </Section>
  );
}
