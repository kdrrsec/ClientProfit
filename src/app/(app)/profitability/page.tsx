import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { Empty } from "@/components/client-detail/section";
import { Pagination } from "@/components/clients/pagination";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProfitTable } from "@/components/profitability/profit-table";
import { sectionHref } from "@/components/sections/section-href";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { profitabilityParams } from "@/lib/validation/profitability-params";
import type { SearchParams } from "@/lib/validation/section-params";
import { requireOrgContext } from "@/server/auth/context";
import { getProfitabilityTable, PROFIT_PAGE_SIZE, type ProfitSort, type ProfitView } from "@/server/services/profitability-table";

export const metadata: Metadata = { title: "Profitability" };

const VIEWS: { id: ProfitView; label: string }[] = [
  { id: "all", label: "All clients" },
  { id: "active", label: "Active clients" },
  { id: "negative", label: "Negative margin" },
  { id: "low", label: "Low margin" },
];

const PRESETS: { sort: ProfitSort; label: string }[] = [
  { sort: "mrr", label: "Highest revenue" },
  { sort: "profit", label: "Highest profit" },
  { sort: "costs", label: "Highest cost" },
  { sort: "hours", label: "Highest hours" },
];

function Chip({ href, active, children }: { href: ReturnType<typeof sectionHref>; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs whitespace-nowrap transition-colors",
        active ? "border-foreground bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export default async function ProfitabilityPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = profitabilityParams.parse(await searchParams);
  const dir = p.dir ?? (p.sort === "name" ? "asc" : "desc");
  const data = await getProfitabilityTable(ctx, { search: p.q, view: p.view, sort: p.sort, direction: dir, page: p.page });
  const { company, currency: c } = data;
  const base = { q: p.q, view: p.view === "all" ? undefined : p.view };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Profitability"
        description={`Monthly run-rate per client: revenue − direct costs − labour. Labour is averaged over the last ${data.labourWindowMonths} months at internal hourly cost.`}
      />

      <section aria-label="Company totals" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Recurring revenue" value={formatMoney(company.mrr, c)} detail={`ARR ${formatMoney(company.annualRevenue, c, { whole: true })}`} />
        <KpiCard label="Recurring costs" value={formatMoney(company.costs, c)} detail="direct costs / month" />
        <KpiCard label="Labour costs" value={formatMoney(company.labour, c)} detail={`${company.hours.toFixed(1).replace(".", ",")} h / month`} />
        <KpiCard label="Gross profit" value={formatMoney(company.profit, c)} detail={`${formatMoney(company.annualProfit, c, { whole: true })} / year`} />
        <KpiCard label="Average margin" value={formatPercent(company.margin)} detail="profit ÷ revenue" />
      </section>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="Filter" className="flex flex-wrap gap-2">
              {VIEWS.map((v) => (
                <Chip key={v.id} href={sectionHref("/profitability", { q: p.q, view: v.id === "all" ? undefined : v.id, sort: p.sort, dir })} active={p.view === v.id}>
                  {v.label}
                  <span className="tabular-nums opacity-70">{data.counts[v.id]}</span>
                </Chip>
              ))}
            </nav>
            <form action="/profitability" role="search" className="flex gap-2 lg:w-80">
              {base.view && <input type="hidden" name="view" value={base.view} />}
              <input type="hidden" name="sort" value={p.sort} />
              <input type="hidden" name="dir" value={dir} />
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input name="q" defaultValue={p.q} placeholder="Search client" aria-label="Search client" className="pl-9" />
              </div>
              <Button type="submit" variant="outline">Search</Button>
            </form>
          </div>
          <nav aria-label="Sort presets" className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            {PRESETS.map((s) => (
              <Chip key={s.sort} href={sectionHref("/profitability", { ...base, sort: s.sort, dir: "desc" })} active={p.sort === s.sort && dir === "desc"}>
                {s.label}
              </Chip>
            ))}
          </nav>
        </CardContent>
        <CardContent className="px-2">
          {data.total === 0 ? (
            <Empty>No clients match this selection.</Empty>
          ) : (
            <>
              <ProfitTable rows={data.rows} totals={data.selection} currency={c} current={{ sort: p.sort, dir }} base={base} />
              <div className="px-3">
                <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={PROFIT_PAGE_SIZE} href={(page) => sectionHref("/profitability", { ...base, sort: p.sort, dir, page })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
