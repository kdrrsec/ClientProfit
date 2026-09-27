import Link from "next/link";
import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { AttentionList } from "@/components/dashboard/attention-list";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProfitTable } from "@/components/dashboard/profit-table";
import { RenewalsList } from "@/components/dashboard/renewals-list";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { requireOrgContext } from "@/server/auth/context";
import { getDashboardData } from "@/server/services/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("dashboard.title") };
}

const RENEWALS_SHOWN = 8;

export default async function DashboardPage() {
  const ctx = await requireOrgContext();
  const [data, { t, locale }] = await Promise.all([getDashboardData(ctx), getI18n()]);
  const { kpis, currency } = data;
  const renewals30 = data.renewals.filter((r) => r.daysUntil <= 30);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.subtitle", { date: formatDate(data.today, locale), months: data.labourWindowMonths })}
        </p>
      </header>

      <section aria-label={t("a11y.keyFigures")} className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={t("kpi.mrr")} value={formatMoney(kpis.mrr, currency)} detail={t("kpi.arr", { value: formatMoney(kpis.arr, currency, { whole: true }) })} />
        <KpiCard
          label={t("kpi.monthlyCosts")}
          value={formatMoney(kpis.monthlyCosts, currency)}
          detail={t("kpi.costsBreakdown", { direct: formatMoney(kpis.monthlyDirectCosts, currency, { whole: true }), labour: formatMoney(kpis.monthlyLabour, currency, { whole: true }) })}
        />
        <KpiCard label={t("kpi.grossProfit")} value={formatMoney(kpis.grossProfit, currency)} detail={t("kpi.perMonth")} />
        <KpiCard label={t("kpi.averageMargin")} value={formatPercent(kpis.margin)} detail={t("kpi.profitOverRevenue")} />
        <KpiCard label={t("kpi.activeClients")} value={String(kpis.activeClients)} />
        <KpiCard label={t("kpi.recurringServices")} value={String(kpis.recurringItems)} detail={t("kpi.inclHostingDomains")} />
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("dashboard.profitPerClient")}</CardTitle>
            <CardDescription>{t("dashboard.profitPerClientDesc")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 md:px-2">
          <ProfitTable rows={data.rows} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("dashboard.revenueVsCosts")}</CardTitle>
            <CardDescription>{t("dashboard.revenueVsCostsDesc")}</CardDescription>
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
              <CardTitle>{t("dashboard.upcomingRenewals")}</CardTitle>
              <CardDescription>{t("dashboard.upcomingRenewalsDesc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RenewalsList items={renewals30.slice(0, RENEWALS_SHOWN)} />
            <Link href="/renewals" className="mt-3 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {renewals30.length > RENEWALS_SHOWN ? t("dashboard.moreCount", { n: renewals30.length - RENEWALS_SHOWN }) : ""}
              {t("dashboard.viewAllRenewals")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("dashboard.attention")}</CardTitle>
              <CardDescription>{t("dashboard.attentionDesc")}</CardDescription>
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
