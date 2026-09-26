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
import { formatDate, formatMoney } from "@/lib/format";
import { toMoney } from "@/lib/profitability";
import { timeParams, type SearchParams } from "@/lib/validation/section-params";
import { deleteTimeEntryAction } from "@/server/actions/records";
import { requireOrgContext } from "@/server/auth/context";
import { getTimeEntry } from "@/server/repositories/records";
import { NotFoundError } from "@/server/errors";
import { getTimeSection, TIME_PAGE_SIZE } from "@/server/services/sections";

export const metadata: Metadata = { title: "Time" };

const hoursText = (h: { toFixed(n: number): string }) => h.toFixed(2).replace(".", ",");

export default async function TimePage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = timeParams.parse(await searchParams);
  const data = await getTimeSection(ctx, { search: p.q, clientId: p.client, from: p.from, to: p.to, page: p.page });
  const { settings } = data;
  const c = settings.currency;
  const filters = { q: p.q, client: p.client, from: p.from && isoDate(p.from), to: p.to && isoDate(p.to), page: p.page };
  const returnTo = sectionHref("/time", filters);
  // The entry being edited may be on another page, so load it directly (org-scoped).
  const editing = p.edit ? await getTimeEntry(ctx, p.edit).catch((e) => (e instanceof NotFoundError ? undefined : Promise.reject(e))) : undefined;
  const filtered = Boolean(p.q || p.client || p.from || p.to);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Time" description="Hours are costed at the internal hourly cost (your cost price, not the sales rate) and count as labour in client profitability." />

      <FormPanel title={editing ? "Edit time entry" : "Log time"}>
        {data.clientOptions.length === 0 && !editing ? (
          <NoClientsYet what="Time entries" />
        ) : (
          <TimeEntryForm
            key={editing?.id ?? "new"}
            clientId={editing?.clientId ?? p.client ?? data.clientOptions[0]!.value}
            clientOptions={editing ? undefined : data.clientOptions}
            recordId={editing?.id}
            submitLabel={editing ? "Save changes" : "Log time"}
            defaults={timeEntryDefaults(editing, isoDate(settings.today), settings.defaultHourlyCost)}
            returnTo={returnTo}
            cancelHref={editing ? returnTo : undefined}
            currency={c}
          />
        )}
      </FormPanel>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label="Hours" value={hoursText(data.totalHours)} detail={filtered ? "in this selection" : "all time"} />
        <KpiCard label="Labour cost" value={formatMoney(data.totalLabour, c)} detail={filtered ? "in this selection" : "all time"} />
        <KpiCard label="Entries" value={String(data.total)} />
      </section>

      <Card>
        <CardContent className="pt-5">
          <FilterBar
            action="/time"
            search={p.q}
            placeholder="Search description"
            active={filtered}
            selects={[{ name: "client", label: "All clients", value: p.client, options: data.clientOptions }]}
            dates={[
              { name: "from", label: "From", value: p.from && isoDate(p.from) },
              { name: "to", label: "To", value: p.to && isoDate(p.to) },
            ]}
          />
        </CardContent>
        <CardContent className="px-2">
          {data.entries.length === 0 ? (
            <Empty>No time entries found.</Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Internal rate</TableHead>
                    <TableHead className="text-right">Labour cost</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums">{formatDate(e.date)}</TableCell>
                      <TableCell><ClientLink client={e.client} /></TableCell>
                      <TableCell className="max-w-80 truncate">{e.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{hoursText(toMoney(e.hours))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(toMoney(e.hourlyCost), c)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(e.labour, c)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.user?.name ?? "—"}</TableCell>
                      <TableCell>
                        <RowActions editHref={sectionHref("/time", { ...filters, edit: e.id })} deleteAction={deleteTimeEntryAction} id={e.id} returnTo={returnTo} what="time entry" />
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
