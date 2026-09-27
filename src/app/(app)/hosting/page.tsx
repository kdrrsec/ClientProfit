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
import { formatDate, formatMoney, formatRelativeDays } from "@/lib/format";
import { dayNumber, isWithin, toMoney } from "@/lib/profitability";
import { commonSectionParams, type SearchParams } from "@/lib/validation/section-params";
import { getI18n } from "@/i18n/server";
import { deleteHostingAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getHostingSection } from "@/server/services/sections";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("nav.hosting") };
}

export default async function HostingPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = commonSectionParams.parse(await searchParams);
  const data = await getHostingSection(ctx, { search: p.q, clientId: p.client });
  const { settings, totals } = data;
  const { t, locale } = await getI18n();
  const c = settings.currency;
  const filters = { q: p.q, client: p.client };
  const returnTo = sectionHref("/hosting", filters);
  const editing = p.edit ? data.rows.find((h) => h.id === p.edit) : undefined;
  const todayNum = dayNumber(settings.today);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title={t("nav.hosting")}
        description={t("hostingPage.description")}
        actions={
          <Link href={sectionHref("/hosting", { ...filters, new: "1" })} className={buttonVariants()}>
            <Plus aria-hidden /> {t("add.hosting")}
          </Link>
        }
      />
      <section aria-label={t("a11y.keyFigures")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("hostingPage.active")} value={String(data.activeCount)} />
        <KpiCard label={t("hostingPage.revenueMonth")} value={formatMoney(totals.monthlyRevenue, c)} />
        <KpiCard label={t("hostingPage.costsMonth")} value={formatMoney(totals.monthlyCosts, c)} />
        <KpiCard label={t("hostingPage.profitMonth")} value={formatMoney(totals.monthlyProfit, c)} detail={t("common.perYear", { value: formatMoney(totals.annualProfit, c) })} />
      </section>

      {(p.new || editing) && (
        <FormPanel title={editing ? t("services.edit", { name: editing.product }) : t("add.hosting")}>
          {data.clientOptions.length === 0 && !editing ? (
            <NoClientsYet what="noClients.hosting" />
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
            placeholder={t("hostingPage.search")}
            active={Boolean(p.q || p.client)}
            selects={[{ name: "client", label: t("common.allClients"), value: p.client, options: data.clientOptions }]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>{t("hostingPage.empty")}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.product")}</TableHead>
                  <TableHead>{t("table.client")}</TableHead>
                  <TableHead className="text-right">{t("col.price")}</TableHead>
                  <TableHead className="text-right">{t("col.cost")}</TableHead>
                  <TableHead className="text-right">{t("col.profitPerMonth")}</TableHead>
                  <TableHead>{t("col.renewal")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((h) => {
                  const fig = data.bySource.get(h.id);
                  const active = isWithin(settings.today, h.startDate, h.endDate);
                  const days = h.renewalDate ? dayNumber(h.renewalDate) - todayNum : null;
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
                            <div className="text-sm tabular-nums">{formatDate(h.renewalDate, locale)}</div>
                            {days !== null && active && days <= 14 && <div className={days < 0 ? "text-xs text-critical" : "text-xs text-warning"}>{formatRelativeDays(days, t)}</div>}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {dayNumber(h.startDate) > todayNum ? <Badge variant="neutral">{t("recordState.upcoming")}</Badge> : active ? <Badge variant="positive">{t("recordState.active")}</Badge> : <Badge variant="neutral">{t("recordState.ended")}</Badge>}
                      </TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/hosting", { ...filters, edit: h.id })} deleteAction={deleteHostingAction} id={h.id} returnTo={returnTo} what="what.hosting" />
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
