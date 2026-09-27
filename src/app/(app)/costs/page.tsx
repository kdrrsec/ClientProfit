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
import { COST_CATEGORIES, enumOptions } from "@/lib/labels";
import { getI18n } from "@/i18n/server";
import { dayNumber, isWithin, toMoney } from "@/lib/profitability";
import { costParams, type SearchParams } from "@/lib/validation/section-params";
import { deleteCostAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getCostsSection } from "@/server/services/sections";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("nav.costs") };
}

export default async function CostsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = costParams.parse(await searchParams);
  const data = await getCostsSection(ctx, { search: p.q, category: p.category, clientId: p.client });
  const { settings, totals } = data;
  const { t, locale } = await getI18n();
  const c = settings.currency;
  const filters = { q: p.q, category: p.category, client: p.client };
  const returnTo = sectionHref("/costs", filters);
  const editing = p.edit ? data.rows.find((x) => x.id === p.edit) : undefined;
  const todayNum = dayNumber(settings.today);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title={t("nav.costs")}
        description={t("costsPage.description")}
        actions={
          <Link href={sectionHref("/costs", { ...filters, new: "1" })} className={buttonVariants()}>
            <Plus aria-hidden /> {t("add.cost")}
          </Link>
        }
      />
      <section aria-label={t("a11y.keyFigures")} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label={t("costsPage.perMonth")} value={formatMoney(totals.monthlyCosts, c)} />
        <KpiCard label={t("costsPage.perYear")} value={formatMoney(totals.annualCosts, c)} />
        <KpiCard label={t("costsPage.items")} value={String(data.rows.length)} />
      </section>

      {(p.new || editing) && (
        <FormPanel title={editing ? t("services.edit", { name: editing.name }) : t("add.cost")}>
          {data.clientOptions.length === 0 && !editing ? (
            <NoClientsYet what="noClients.costs" />
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
            placeholder={t("costsPage.search")}
            active={Boolean(p.q || p.category || p.client)}
            selects={[
              { name: "client", label: t("common.allClients"), value: p.client, options: data.clientOptions },
              { name: "category", label: t("costsPage.allCategories"), value: p.category, options: enumOptions(t, "costCategory", COST_CATEGORIES) },
            ]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>{t("costsPage.empty")}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.name")}</TableHead>
                  <TableHead>{t("table.client")}</TableHead>
                  <TableHead className="text-right">{t("col.amount")}</TableHead>
                  <TableHead className="text-right">{t("col.monthlyEquiv")}</TableHead>
                  <TableHead>{t("col.period")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
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
                        <div className="text-xs text-muted-foreground">{t(`costCategory.${x.category}`)}</div>
                      </TableCell>
                      <TableCell><ClientLink client={x.client} /></TableCell>
                      <TableCell className="text-right"><AmountPer amount={toMoney(x.amount)} interval={x.billingInterval} currency={c} /></TableCell>
                      <TableCell className="text-right tabular-nums">{oneTime ? "—" : fig ? formatMoney(fig.monthlyCosts, c) : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {oneTime ? formatDate(x.startDate, locale) : x.endDate ? t("period.range", { from: formatDate(x.startDate, locale), to: formatDate(x.endDate, locale) }) : t("period.since", { from: formatDate(x.startDate, locale) })}
                      </TableCell>
                      <TableCell>
                        {oneTime ? (
                          <Badge variant="neutral">{t("recordState.one-time")}</Badge>
                        ) : dayNumber(x.startDate) > todayNum ? (
                          <Badge variant="neutral">{t("recordState.upcoming")}</Badge>
                        ) : isWithin(settings.today, x.startDate, x.endDate) ? (
                          <Badge variant="positive">{t("recordState.active")}</Badge>
                        ) : (
                          <Badge variant="neutral">{t("recordState.ended")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/costs", { ...filters, edit: x.id })} deleteAction={deleteCostAction} id={x.id} returnTo={returnTo} what="what.cost" />
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
