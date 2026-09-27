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
import { formatHours, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { profitabilityParams } from "@/lib/validation/profitability-params";
import type { SearchParams } from "@/lib/validation/section-params";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages/en";
import { requireOrgContext } from "@/server/auth/context";
import { getProfitabilityTable, PROFIT_PAGE_SIZE, type ProfitSort, type ProfitView } from "@/server/services/profitability-table";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("nav.profitability") };
}

const VIEWS: ProfitView[] = ["all", "active", "negative", "low"];
const PRESETS: ("mrr" | "profit" | "costs" | "hours")[] = ["mrr", "profit", "costs", "hours"];
const presetLabel = (sort: ProfitSort) => `profitPage.preset.${sort}` as MessageKey;

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
  const { t } = await getI18n();
  const base = { q: p.q, view: p.view === "all" ? undefined : p.view };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title={t("nav.profitability")}
        description={t("profitPage.description", { months: data.labourWindowMonths })}
      />

      <section aria-label={t("profitPage.companyTotals")} className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label={t("profitPage.recurringRevenue")} value={formatMoney(company.mrr, c)} detail={t("kpi.arr", { value: formatMoney(company.annualRevenue, c, { whole: true }) })} />
        <KpiCard label={t("profitPage.recurringCosts")} value={formatMoney(company.costs, c)} detail={t("profitPage.directPerMonth")} />
        <KpiCard label={t("profitPage.labourCosts")} value={formatMoney(company.labour, c)} detail={t("profitPage.hoursPerMonth", { hours: formatHours(company.hours, 1) })} />
        <KpiCard label={t("kpi.grossProfit")} value={formatMoney(company.profit, c)} detail={t("common.perYear", { value: formatMoney(company.annualProfit, c, { whole: true }) })} />
        <KpiCard label={t("kpi.averageMargin")} value={formatPercent(company.margin)} detail={t("kpi.profitOverRevenue")} />
      </section>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label={t("common.filter")} className="flex flex-wrap gap-2">
              {VIEWS.map((v) => (
                <Chip key={v} href={sectionHref("/profitability", { q: p.q, view: v === "all" ? undefined : v, sort: p.sort, dir })} active={p.view === v}>
                  {t(`profitPage.view.${v}`)}
                  <span className="tabular-nums opacity-70">{data.counts[v]}</span>
                </Chip>
              ))}
            </nav>
            <form action="/profitability" role="search" className="flex gap-2 lg:w-80">
              {base.view && <input type="hidden" name="view" value={base.view} />}
              <input type="hidden" name="sort" value={p.sort} />
              <input type="hidden" name="dir" value={dir} />
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input name="q" defaultValue={p.q} placeholder={t("profitPage.searchClient")} aria-label={t("profitPage.searchClient")} className="pl-9" />
              </div>
              <Button type="submit" variant="outline">{t("common.search")}</Button>
            </form>
          </div>
          <nav aria-label={t("profitPage.sortPresets")} className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("profitPage.sort")}</span>
            {PRESETS.map((sort) => (
              <Chip key={sort} href={sectionHref("/profitability", { ...base, sort, dir: "desc" })} active={p.sort === sort && dir === "desc"}>
                {t(presetLabel(sort))}
              </Chip>
            ))}
          </nav>
        </CardContent>
        <CardContent className="px-2">
          {data.total === 0 ? (
            <Empty>{t("profitPage.empty")}</Empty>
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
