import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { Pagination } from "@/components/clients/pagination";
import { RowActions } from "@/components/client-detail/row-actions";
import { Empty, FormPanel } from "@/components/client-detail/section";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { isoDate, timeEntryDefaults } from "@/components/records/defaults";
import { TimeEntryForm } from "@/components/records/time-entry-form";
import { ClientLink } from "@/components/sections/client-link";
import { FilterBar } from "@/components/sections/filter-bar";
import { NoClientsYet } from "@/components/sections/no-clients";
import { sectionHref } from "@/components/sections/section-href";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatHours, formatMoney } from "@/lib/format";
import { toMoney } from "@/lib/profitability";
import { timeParams, type SearchParams } from "@/lib/validation/section-params";
import { getI18n } from "@/i18n/server";
import { deleteTimeEntryAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getTimeEntry } from "@/server/repositories/records";
import { NotFoundError } from "@/server/errors";
import { getTimeSection, TIME_PAGE_SIZE } from "@/server/services/sections";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("nav.time") };
}


export default async function TimePage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = timeParams.parse(await searchParams);
  const data = await getTimeSection(ctx, { search: p.q, clientId: p.client, from: p.from, to: p.to, page: p.page });
  const { settings } = data;
  const { t, locale } = await getI18n();
  const c = settings.currency;
  const filters = { q: p.q, client: p.client, from: p.from && isoDate(p.from), to: p.to && isoDate(p.to), page: p.page };
  const returnTo = sectionHref("/time", filters);
  // The entry being edited may be on another page, so load it directly (org-scoped).
  const editing = p.edit ? await getTimeEntry(ctx, p.edit).catch((e) => (e instanceof NotFoundError ? undefined : Promise.reject(e))) : undefined;
  const filtered = Boolean(p.q || p.client || p.from || p.to);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={t("nav.time")} description={t("timePage.description")} />

      <FormPanel title={editing ? t("time.editTitle") : t("time.logTitle")}>
        {data.clientOptions.length === 0 && !editing ? (
          <NoClientsYet what="noClients.time" />
        ) : (
          <TimeEntryForm
            key={editing?.id ?? "new"}
            clientId={editing?.clientId ?? p.client ?? data.clientOptions[0]!.value}
            clientOptions={editing ? undefined : data.clientOptions}
            recordId={editing?.id}
            submitLabel={editing ? t("common.saveChanges") : t("time.logTitle")}
            defaults={timeEntryDefaults(editing, isoDate(settings.today), settings.defaultHourlyCost)}
            returnTo={returnTo}
            cancelHref={editing ? returnTo : undefined}
            currency={c}
          />
        )}
      </FormPanel>

      <section aria-label={t("a11y.keyFigures")} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label={t("timePage.hours")} value={formatHours(data.totalHours)} detail={filtered ? t("common.inThisSelection") : t("common.allTime")} />
        <KpiCard label={t("timePage.labourCost")} value={formatMoney(data.totalLabour, c)} detail={filtered ? t("common.inThisSelection") : t("common.allTime")} />
        <KpiCard label={t("timePage.entries")} value={String(data.total)} />
      </section>

      <Card>
        <CardContent className="pt-5">
          <FilterBar
            action="/time"
            search={p.q}
            placeholder={t("timePage.search")}
            active={filtered}
            selects={[{ name: "client", label: t("common.allClients"), value: p.client, options: data.clientOptions }]}
            dates={[
              { name: "from", label: t("common.from"), value: p.from && isoDate(p.from) },
              { name: "to", label: t("common.to"), value: p.to && isoDate(p.to) },
            ]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.entries.length === 0 ? (
            <Empty>{t("timePage.empty")}</Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("col.date")}</TableHead>
                    <TableHead>{t("table.client")}</TableHead>
                    <TableHead>{t("col.description")}</TableHead>
                    <TableHead className="text-right">{t("col.hours")}</TableHead>
                    <TableHead className="text-right">{t("col.internalRate")}</TableHead>
                    <TableHead className="text-right">{t("col.labourCost")}</TableHead>
                    <TableHead>{t("col.by")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums">{formatDate(e.date, locale)}</TableCell>
                      <TableCell><ClientLink client={e.client} /></TableCell>
                      <TableCell className="max-w-80 truncate">{e.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(toMoney(e.hours))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(toMoney(e.hourlyCost), c)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(e.labour, c)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.user?.name ?? "—"}</TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/time", { ...filters, edit: e.id })} deleteAction={deleteTimeEntryAction} id={e.id} returnTo={returnTo} what="what.timeEntry" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-3">
                <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={TIME_PAGE_SIZE} href={(page) => sectionHref("/time", { ...filters, page })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
