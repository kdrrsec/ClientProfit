import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { RowActions } from "@/components/client-detail/row-actions";
import { Empty, FormPanel } from "@/components/client-detail/section";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { domainDefaults, isoDate } from "@/components/records/defaults";
import { DomainForm } from "@/components/records/domain-form";
import { ClientLink } from "@/components/sections/client-link";
import { FilterBar } from "@/components/sections/filter-bar";
import { NoClientsYet } from "@/components/sections/no-clients";
import { sectionHref } from "@/components/sections/section-href";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatRelativeDays } from "@/lib/format";
import { DOMAIN_STATUS_LABELS, options } from "@/lib/labels";
import { addYears, toMoney } from "@/lib/profitability";
import { domainParams, type SearchParams } from "@/lib/validation/section-params";
import { deleteDomainAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getDomainsSection } from "@/server/services/sections";

export const metadata: Metadata = { title: "Domains" };

const STATUS_VARIANT = { ACTIVE: "positive", EXPIRING: "warning", EXPIRED: "critical", CANCELLED: "neutral" } as const;

export default async function DomainsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = domainParams.parse(await searchParams);
  const data = await getDomainsSection(ctx, { search: p.q, status: p.status, clientId: p.client, renewalDays: p.renewal ? Number(p.renewal) : undefined });
  const { settings, totals } = data;
  const c = settings.currency;
  const filters = { q: p.q, status: p.status, client: p.client, renewal: p.renewal };
  const returnTo = sectionHref("/domains", filters);
  const editing = p.edit ? data.rows.find((r) => r.domain.id === p.edit)?.domain : undefined;
  const today = isoDate(settings.today);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Domains"
        description="All domains across clients. Figures are yearly and use the first-year or renewal cost that applies today."
        actions={
          <Link href={sectionHref("/domains", { ...filters, new: "1" })} className={buttonVariants()}>
            <Plus aria-hidden /> Add domain
          </Link>
        }
      />
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active domains" value={String(data.activeCount)} detail={p.q || p.status || p.client || p.renewal ? "in this selection" : undefined} />
        <KpiCard label="Revenue / year" value={formatMoney(totals.annualRevenue, c)} />
        <KpiCard label="Profit / year" value={formatMoney(totals.annualProfit, c)} detail={`${formatMoney(totals.annualCosts, c)} costs`} />
        <KpiCard label="Renewing within 30 days" value={String(data.renewing30)} />
      </section>

      {(p.new || editing) && (
        <FormPanel title={editing ? `Edit ${editing.domain}` : "Add domain"}>
          {data.clientOptions.length === 0 && !editing ? (
            <NoClientsYet what="Domains" />
          ) : (
            <DomainForm
              key={editing?.id ?? "new"}
              clientId={editing?.clientId ?? p.client ?? data.clientOptions[0]!.value}
              clientOptions={editing ? undefined : data.clientOptions}
              recordId={editing?.id}
              defaults={domainDefaults(editing, today, isoDate(addYears(settings.today, 1)))}
              returnTo={returnTo}
              cancelHref={returnTo}
              currency={c}
            />
          )}
        </FormPanel>
      )}

      <Card>
        <CardContent className="pt-5">
          <FilterBar
            action="/domains"
            search={p.q}
            placeholder="Search domain, registrar or client"
            active={Boolean(p.q || p.status || p.client || p.renewal)}
            selects={[
              { name: "client", label: "All clients", value: p.client, options: data.clientOptions },
              { name: "status", label: "All statuses", value: p.status, options: options(DOMAIN_STATUS_LABELS) },
              { name: "renewal", label: "Any renewal date", value: p.renewal, options: [{ value: "7", label: "Renews within 7 days" }, { value: "30", label: "Renews within 30 days" }, { value: "90", label: "Renews within 90 days" }] },
            ]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>No domains found.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Price / year</TableHead>
                  <TableHead className="text-right">Cost / year</TableHead>
                  <TableHead className="text-right">Profit / year</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map(({ domain: d, daysUntilRenewal: days }) => {
                  const fig = data.bySource.get(d.id);
                  const live = d.status !== "CANCELLED";
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{d.domain}</div>
                        <div className="text-xs text-muted-foreground">{d.registrar ?? "—"}</div>
                      </TableCell>
                      <TableCell><ClientLink client={d.client} /></TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(toMoney(d.sellingPrice), c)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fig ? formatMoney(fig.annualCosts, c) : "—"}
                        {fig?.costPhase === "FIRST_YEAR" && <div className="text-xs">first-year price</div>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fig ? formatMoney(fig.annualProfit, c) : "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm tabular-nums">{formatDate(d.renewalDate)}</div>
                        <div className={live && days < 0 ? "text-xs text-critical" : live && days <= 30 ? "text-xs text-warning" : "text-xs text-muted-foreground"}>
                          {live ? `${formatRelativeDays(days)} · auto-renew ${d.autoRenew ? "on" : "off"}` : "—"}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[d.status]}>{DOMAIN_STATUS_LABELS[d.status]}</Badge></TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/domains", { ...filters, edit: d.id })} deleteAction={deleteDomainAction} id={d.id} returnTo={returnTo} what="domain" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
