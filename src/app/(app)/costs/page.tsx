import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { AmountPer } from "@/components/client-detail/money";
import { RowActions } from "@/components/client-detail/row-actions";
import { Empty, FormPanel } from "@/components/client-detail/section";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CostForm } from "@/components/records/cost-form";
import { costDefaults, isoDate } from "@/components/records/defaults";
import { ClientLink } from "@/components/sections/client-link";
import { FilterBar } from "@/components/sections/filter-bar";
import { NoClientsYet } from "@/components/sections/no-clients";
import { sectionHref } from "@/components/sections/section-href";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import { COST_CATEGORY_LABELS, options } from "@/lib/labels";
import { dayNumber, isWithin, toMoney } from "@/lib/profitability";
import { costParams, type SearchParams } from "@/lib/validation/section-params";
import { deleteCostAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getCostsSection } from "@/server/services/sections";

export const metadata: Metadata = { title: "Costs" };

export default async function CostsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = costParams.parse(await searchParams);
  const data = await getCostsSection(ctx, { search: p.q, category: p.category, clientId: p.client });
  const { settings, totals } = data;
  const c = settings.currency;
  const filters = { q: p.q, category: p.category, client: p.client };
  const returnTo = sectionHref("/costs", filters);
  const editing = p.edit ? data.rows.find((x) => x.id === p.edit) : undefined;
  const t = dayNumber(settings.today);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Other costs"
        description="Client-bound costs besides supplier costs of services, domains and hosting: subscriptions, plugins, freelancers, tools."
        actions={
          <Link href={sectionHref("/costs", { ...filters, new: "1" })} className={buttonVariants()}>
            <Plus aria-hidden /> Add cost
          </Link>
        }
      />
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label="Recurring costs / month" value={formatMoney(totals.monthlyCosts, c)} />
        <KpiCard label="Recurring costs / year" value={formatMoney(totals.annualCosts, c)} />
        <KpiCard label="Cost items" value={String(data.rows.length)} />
      </section>

      {(p.new || editing) && (
        <FormPanel title={editing ? `Edit ${editing.name}` : "Add cost"}>
          {data.clientOptions.length === 0 && !editing ? (
            <NoClientsYet what="Costs" />
          ) : (
            <CostForm
              key={editing?.id ?? "new"}
              clientId={editing?.clientId ?? p.client ?? data.clientOptions[0]!.value}
              clientOptions={editing ? undefined : data.clientOptions}
              recordId={editing?.id}
              defaults={costDefaults(editing, isoDate(settings.today), settings.defaultBillingInterval)}
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
            action="/costs"
            search={p.q}
            placeholder="Search name, notes or client"
            active={Boolean(p.q || p.category || p.client)}
            selects={[
              { name: "client", label: "All clients", value: p.client, options: data.clientOptions },
              { name: "category", label: "All categories", value: p.category, options: options(COST_CATEGORY_LABELS) },
            ]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>No costs found.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Monthly equiv.</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((x) => {
                  const fig = data.bySource.get(x.id);
                  const oneTime = x.billingInterval === "ONE_TIME";
                  return (
                    <TableRow key={x.id}>
                      <TableCell>
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-muted-foreground">{COST_CATEGORY_LABELS[x.category]}</div>
                      </TableCell>
                      <TableCell><ClientLink client={x.client} /></TableCell>
                      <TableCell className="text-right"><AmountPer amount={toMoney(x.amount)} interval={x.billingInterval} currency={c} /></TableCell>
                      <TableCell className="text-right tabular-nums">{oneTime ? "—" : fig ? formatMoney(fig.monthlyCosts, c) : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {oneTime ? formatDate(x.startDate) : x.endDate ? `${formatDate(x.startDate)} – ${formatDate(x.endDate)}` : `Since ${formatDate(x.startDate)}`}
                      </TableCell>
                      <TableCell>
                        {oneTime ? (
                          <Badge variant="neutral">One-time</Badge>
                        ) : dayNumber(x.startDate) > t ? (
                          <Badge variant="neutral">Upcoming</Badge>
                        ) : isWithin(settings.today, x.startDate, x.endDate) ? (
                          <Badge variant="positive">Active</Badge>
                        ) : (
                          <Badge variant="neutral">Ended</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/costs", { ...filters, edit: x.id })} deleteAction={deleteCostAction} id={x.id} returnTo={returnTo} what="cost" />
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
