import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { AmountPer } from "@/components/client-detail/money";
import { RowActions } from "@/components/client-detail/row-actions";
import { Empty, FormPanel } from "@/components/client-detail/section";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { hostingDefaults, isoDate } from "@/components/records/defaults";
import { HostingForm } from "@/components/records/hosting-form";
import { ClientLink } from "@/components/sections/client-link";
import { FilterBar } from "@/components/sections/filter-bar";
import { NoClientsYet } from "@/components/sections/no-clients";
import { sectionHref } from "@/components/sections/section-href";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { dayNumber, isWithin, toMoney } from "@/lib/profitability";
import { commonSectionParams, type SearchParams } from "@/lib/validation/section-params";
import { deleteHostingAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getHostingSection } from "@/server/services/sections";

export const metadata: Metadata = { title: "Hosting" };

export default async function HostingPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = commonSectionParams.parse(await searchParams);
  const data = await getHostingSection(ctx, { search: p.q, clientId: p.client });
  const { settings, totals } = data;
  const c = settings.currency;
  const filters = { q: p.q, client: p.client };
  const returnTo = sectionHref("/hosting", filters);
  const editing = p.edit ? data.rows.find((h) => h.id === p.edit) : undefined;
  const t = dayNumber(settings.today);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Hosting"
        description="Hosting products you resell, across all clients. Monthly figures are normalised from each billing interval."
        actions={
          <Link href={sectionHref("/hosting", { ...filters, new: "1" })} className={buttonVariants()}>
            <Plus aria-hidden /> Add hosting
          </Link>
        }
      />
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active products" value={String(data.activeCount)} />
        <KpiCard label="Revenue / month" value={formatMoney(totals.monthlyRevenue, c)} />
        <KpiCard label="Costs / month" value={formatMoney(totals.monthlyCosts, c)} />
        <KpiCard label="Profit / month" value={formatMoney(totals.monthlyProfit, c)} detail={`${formatMoney(totals.annualProfit, c)} / year`} />
      </section>

      {(p.new || editing) && (
        <FormPanel title={editing ? `Edit ${editing.product}` : "Add hosting"}>
          {data.clientOptions.length === 0 && !editing ? (
            <NoClientsYet what="Hosting products" />
          ) : (
            <HostingForm
              key={editing?.id ?? "new"}
              clientId={editing?.clientId ?? p.client ?? data.clientOptions[0]!.value}
              clientOptions={editing ? undefined : data.clientOptions}
              recordId={editing?.id}
              defaults={hostingDefaults(editing, isoDate(settings.today), settings.defaultBillingInterval)}
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
            action="/hosting"
            search={p.q}
            placeholder="Search product, provider, server or client"
            active={Boolean(p.q || p.client)}
            selects={[{ name: "client", label: "All clients", value: p.client, options: data.clientOptions }]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>No hosting products found.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit / month</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((h) => {
                  const fig = data.bySource.get(h.id);
                  const active = isWithin(settings.today, h.startDate, h.endDate);
                  const days = h.renewalDate ? dayNumber(h.renewalDate) - t : null;
                  return (
                    <TableRow key={h.id}>
                      <TableCell>
                        <div className="font-medium">{h.product}</div>
                        <div className="text-xs text-muted-foreground">{[h.provider, h.server].filter(Boolean).join(" · ") || "—"}</div>
                      </TableCell>
                      <TableCell><ClientLink client={h.client} /></TableCell>
                      <TableCell className="text-right"><AmountPer amount={toMoney(h.sellingPrice)} interval={h.billingInterval} currency={c} /></TableCell>
                      <TableCell className="text-right text-muted-foreground"><AmountPer amount={toMoney(h.purchaseCost)} interval={h.billingInterval} currency={c} /></TableCell>
                      <TableCell className="text-right tabular-nums">{fig ? formatMoney(fig.monthlyProfit, c) : "—"}</TableCell>
                      <TableCell>
                        {h.renewalDate ? (
                          <>
                            <div className="text-sm tabular-nums">{formatDate(h.renewalDate)}</div>
                            {days !== null && active && days <= 14 && <div className={days < 0 ? "text-xs text-critical" : "text-xs text-warning"}>{days < 0 ? `${-days} days overdue` : `in ${days} days`}</div>}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {dayNumber(h.startDate) > t ? <Badge variant="neutral">Upcoming</Badge> : active ? <Badge variant="positive">Active</Badge> : <Badge variant="neutral">Ended</Badge>}
                      </TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/hosting", { ...filters, edit: h.id })} deleteAction={deleteHostingAction} id={h.id} returnTo={returnTo} what="hosting product" />
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
