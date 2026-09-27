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
import { DOMAIN_STATUSES, enumOptions } from "@/lib/labels";
import { getI18n } from "@/i18n/server";
import { addYears, toMoney } from "@/lib/profitability";
import { domainParams, type SearchParams } from "@/lib/validation/section-params";
import { deleteDomainAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getDomainsSection } from "@/server/services/sections";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("nav.domains") };
}

const STATUS_VARIANT = { ACTIVE: "positive", EXPIRING: "warning", EXPIRED: "critical", CANCELLED: "neutral" } as const;

export default async function DomainsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = domainParams.parse(await searchParams);
  const data = await getDomainsSection(ctx, { search: p.q, status: p.status, clientId: p.client, renewalDays: p.renewal ? Number(p.renewal) : undefined });
  const { settings, totals } = data;
  const { t, locale } = await getI18n();
  const c = settings.currency;
  const filters = { q: p.q, status: p.status, client: p.client, renewal: p.renewal };
  const returnTo = sectionHref("/domains", filters);
  const editing = p.edit ? data.rows.find((r) => r.domain.id === p.edit)?.domain : undefined;
  const today = isoDate(settings.today);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title={t("nav.domains")}
        description={t("domainsPage.description")}
        actions={
          <Link href={sectionHref("/domains", { ...filters, new: "1" })} className={buttonVariants()}>
            <Plus aria-hidden /> {t("add.domain")}
          </Link>
        }
      />
      <section aria-label={t("a11y.keyFigures")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("domainsPage.active")} value={String(data.activeCount)} detail={p.q || p.status || p.client || p.renewal ? t("common.inThisSelection") : undefined} />
        <KpiCard label={t("domainsPage.revenueYear")} value={formatMoney(totals.annualRevenue, c)} />
        <KpiCard label={t("domainsPage.profitYear")} value={formatMoney(totals.annualProfit, c)} detail={t("domainsPage.costsDetail", { value: formatMoney(totals.annualCosts, c) })} />
        <KpiCard label={t("domainsPage.renewing30")} value={String(data.renewing30)} />
      </section>

      {(p.new || editing) && (
        <FormPanel title={editing ? t("services.edit", { name: editing.domain }) : t("add.domain")}>
          {data.clientOptions.length === 0 && !editing ? (
            <NoClientsYet what="noClients.domains" />
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
            placeholder={t("domainsPage.search")}
            active={Boolean(p.q || p.status || p.client || p.renewal)}
            selects={[
              { name: "client", label: t("common.allClients"), value: p.client, options: data.clientOptions },
              { name: "status", label: t("common.allStatuses"), value: p.status, options: enumOptions(t, "domainStatus", DOMAIN_STATUSES) },
              { name: "renewal", label: t("domainsPage.anyRenewal"), value: p.renewal, options: ["7", "30", "90"].map((n) => ({ value: n, label: t("domainsPage.within", { n }) })) },
            ]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>{t("domainsPage.empty")}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.domain")}</TableHead>
                  <TableHead>{t("table.client")}</TableHead>
                  <TableHead className="text-right">{t("col.pricePerYear")}</TableHead>
                  <TableHead className="text-right">{t("col.costPerYear")}</TableHead>
                  <TableHead className="text-right">{t("col.profitPerYear")}</TableHead>
                  <TableHead>{t("col.renewal")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
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
                        {fig?.costPhase === "FIRST_YEAR" && <div className="text-xs">{t("domain.firstYearPrice")}</div>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fig ? formatMoney(fig.annualProfit, c) : "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm tabular-nums">{formatDate(d.renewalDate, locale)}</div>
                        <div className={live && days < 0 ? "text-xs text-critical" : live && days <= 30 ? "text-xs text-warning" : "text-xs text-muted-foreground"}>
                          {live ? t("domain.autoRenewState", { when: formatRelativeDays(days, t), state: t(d.autoRenew ? "state.on" : "state.off") }) : "—"}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[d.status]}>{t(`domainStatus.${d.status}`)}</Badge></TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/domains", { ...filters, edit: d.id })} deleteAction={deleteDomainAction} id={d.id} returnTo={returnTo} what="what.domain" />
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
