import type Decimal from "decimal.js";
import { AttentionList } from "@/components/dashboard/attention-list";
import { RenewalsList } from "@/components/dashboard/renewals-list";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { MarginStatusBadge } from "@/components/dashboard/status-badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { CLIENT_STATUS_LABELS } from "@/lib/labels";
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
export function ProfitBreakdown({ detail, compact }: Props & { compact?: boolean }) {
  const { profitability: p, settings } = detail;
  const c = settings.currency;
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
          <TableHead className="text-right">Monthly</TableHead>
          {!compact && <TableHead className="text-right">Yearly</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {row("Revenue", p.monthly.revenue, p.annual.revenue)}
        {row("Direct costs", p.monthly.directCosts, p.annual.directCosts, { sign: "−" })}
        {row("Labour", p.monthly.labour, p.annual.labour, { sign: "−" })}
        {row("Gross profit", p.monthly.profit, p.annual.profit, { sign: "=", strong: true })}
        <TableRow>
          <TableCell>
            <span className="inline-block w-4" />
            Margin
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

export function OverviewTab({ detail }: Props) {
  const { client, settings } = detail;
  const address = [client.addressLine1, client.addressLine2, [client.postalCode, client.city].filter(Boolean).join(" "), client.country]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="min-w-0 space-y-6 lg:col-span-3">
        <Section title="Profitability" description="Monthly run-rate. See the Profitability tab for the full calculation.">
          <ProfitBreakdown detail={detail} compact />
        </Section>
        <Section title="Attention needed">
          <AttentionList items={detail.attention} />
        </Section>
      </div>
      <div className="min-w-0 space-y-6 lg:col-span-2">
        <Section title="Client details">
          <dl className="divide-y">
            <Detail label="Status">{CLIENT_STATUS_LABELS[client.status]}</Detail>
            <Detail label="Contact">{client.contactName}</Detail>
            <Detail label="Email">{client.email && <a className="underline-offset-4 hover:underline" href={`mailto:${client.email}`}>{client.email}</a>}</Detail>
            <Detail label="Phone">{client.phone}</Detail>
            <Detail label="Website">
              {client.website && (
                <a className="underline-offset-4 hover:underline" href={client.website} target="_blank" rel="noopener noreferrer">
                  {client.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </Detail>
            <Detail label="Address">{address || null}</Detail>
            <Detail label="VAT number">{client.vatNumber}</Detail>
            <Detail label="KVK number">{client.chamberOfCommerce}</Detail>
            <Detail label="Client since">{client.startDate && formatDate(client.startDate)}</Detail>
            <Detail label="Contract renewal">{client.contractRenewalDate && formatDate(client.contractRenewalDate)}</Detail>
          </dl>
        </Section>
        <Section title="Upcoming renewals" description={`Next 90 days, as of ${formatDate(settings.today)}`}>
          <RenewalsList items={detail.renewals} />
        </Section>
      </div>
    </div>
  );
}

export function RevenueTab({ detail }: Props) {
  return (
    <Section
      title="Revenue"
      description="Everything this client pays, from services, domains and hosting. One-time amounts are excluded from monthly figures."
      flush
    >
      {detail.revenueLines.length === 0 ? (
        <Empty>No revenue recorded. Add a service, domain or hosting product.</Empty>
      ) : (
        <LinesTable clientId={detail.client.id} lines={detail.revenueLines} currency={detail.settings.currency} totalLabel="Active recurring revenue" />
      )}
    </Section>
  );
}

export function CostsTab({ detail, mode }: Props & { mode: TabMode }) {
  return (
    <div className="space-y-6">
      <Section title="All direct costs" description="Supplier costs of services, domain and hosting costs, and other client costs. Labour is shown under Time." flush>
        {detail.costLines.length === 0 ? (
          <Empty>No direct costs recorded.</Empty>
        ) : (
          <LinesTable clientId={detail.client.id} lines={detail.costLines} currency={detail.settings.currency} totalLabel="Active recurring costs" />
        )}
      </Section>
      <OtherCostsSection detail={detail} mode={mode} />
    </div>
  );
}

export function ProfitabilityTab({ detail }: Props) {
  const { profitability: p, settings } = detail;
  const w = p.labourWindow;
  return (
    <div className="space-y-6">
      <Section title="Profit calculation" description="Revenue − direct costs − labour = gross profit. Margin = gross profit ÷ revenue.">
        <ProfitBreakdown detail={detail} />
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          <li>Revenue and direct costs: active recurring items on {formatDate(settings.today)}, normalised (quarterly ÷ 3, yearly ÷ 12).</li>
          <li>
            Labour: {w.hours.toFixed(2).replace(".", ",")} h costing {formatMoney(w.cost, settings.currency)} between {formatDate(w.from)} and {formatDate(w.to)}, averaged over{" "}
            {w.months.toDecimalPlaces(1).toString().replace(".", ",")} months, at internal hourly cost (not the sales rate).
          </li>
          <li>Yearly = yearly equivalents of recurring items, and monthly labour × 12. One-time amounts are not included.</li>
        </ul>
      </Section>
      <Section title="Revenue vs costs" description="Last 12 months for this client, from item dates and time entries (not invoices). Includes one-time amounts.">
        <RevenueChart data={detail.timeline} currency={settings.currency} />
      </Section>
    </div>
  );
}

export function NotesTab({ detail }: Props) {
  return (
    <Section title="Internal notes" description="Only visible to your team.">
      <NotesForm clientId={detail.client.id} notes={detail.client.notes ?? ""} />
    </Section>
  );
}
