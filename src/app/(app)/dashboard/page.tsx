import Link from "next/link";
import type { Metadata } from "next";
import { AttentionList } from "@/components/dashboard/attention-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProfitTable } from "@/components/dashboard/profit-table";
import { RenewalsList } from "@/components/dashboard/renewals-list";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { requireOrgContext } from "@/server/auth/context";
import { getDashboardData } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

const RENEWALS_SHOWN = 8;

export default async function DashboardPage() {
  const ctx = await requireOrgContext();
  const data = await getDashboardData(ctx);
  const { kpis, currency } = data;
  const renewals30 = data.renewals.filter((r) => r.daysUntil <= 30);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monthly run-rate as of {formatDate(data.today)}. Labour is averaged over the last {data.labourWindowMonths} months.
        </p>
      </header>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="MRR" value={formatMoney(kpis.mrr, currency)} detail={`ARR ${formatMoney(kpis.arr, currency, { whole: true })}`} />
        <KpiCard
          label="Monthly costs"
          value={formatMoney(kpis.monthlyCosts, currency)}
          detail={`${formatMoney(kpis.monthlyDirectCosts, currency, { whole: true })} direct · ${formatMoney(kpis.monthlyLabour, currency, { whole: true })} labour`}
        />
        <KpiCard label="Gross profit" value={formatMoney(kpis.grossProfit, currency)} detail="per month" />
        <KpiCard label="Average margin" value={formatPercent(kpis.margin)} detail="profit ÷ revenue" />
        <KpiCard label="Active clients" value={String(kpis.activeClients)} />
        <KpiCard label="Recurring services" value={String(kpis.recurringItems)} detail="incl. hosting & domains" />
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profit per client</CardTitle>
            <CardDescription>Per month. Costs include direct costs and labour. Sorted by profit. Click a client for details.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 md:px-2">
          <ProfitTable rows={data.rows} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Revenue vs costs</CardTitle>
            <CardDescription>Last 12 months, derived from service dates and time entries (not invoices).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueChart data={data.timeline} currency={currency} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming renewals</CardTitle>
              <CardDescription>Next 30 days and overdue</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RenewalsList items={renewals30.slice(0, RENEWALS_SHOWN)} />
            <Link href="/renewals" className="mt-3 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {renewals30.length > RENEWALS_SHOWN ? `+${renewals30.length - RENEWALS_SHOWN} more · ` : ""}View all renewals
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Attention needed</CardTitle>
              <CardDescription>Margins, missing data and renewals</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <AttentionList items={data.attention} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
