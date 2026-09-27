import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { ClientStatusBadge, MarginStatusBadge } from "@/components/dashboard/status-badges";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import { formatMoney, formatPercent } from "@/lib/format";
import { archiveClientAction, deleteClientAction } from "@/server/actions/clients";
import type { ClientDetail } from "@/server/services/clients";

export async function ClientHeader({ detail }: { detail: ClientDetail }) {
  const { client, profitability: p, settings } = detail;
  const c = settings.currency;
  const archived = client.archivedAt !== null;
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> {t("clients.back")}
      </Link>
      {archived && (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t("clientHeader.archivedNotice")}
        </p>
      )}
      <PageHeader
        title={client.companyName}
        actions={
          <>
            <Link href={`/clients/${client.id}/edit` as Route} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {t("common.edit")}
            </Link>
            <form action={archiveClientAction}>
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="archive" value={archived ? "false" : "true"} />
              <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {archived ? t("clientHeader.unarchive") : t("clientHeader.archive")}
              </button>
            </form>
            <ConfirmButton
              action={deleteClientAction}
              fields={{ clientId: client.id }}
              label={t("common.delete")}
              confirmLabel={t("clientHeader.deletePermanently")}
              message={t("clientHeader.deleteMessage")}
            />
          </>
        }
      >
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ClientStatusBadge status={client.status} />
          <MarginStatusBadge status={p.status} />
          {archived && <Badge variant="neutral">{t("common.archived")}</Badge>}
        </div>
      </PageHeader>
      <section aria-label={t("a11y.keyFigures")} className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={t("kpi.monthlyRevenue")} value={formatMoney(p.monthly.revenue, c)} />
        <KpiCard label={t("kpi.monthlyCosts")} value={formatMoney(p.monthly.directCosts.plus(p.monthly.labour), c)} detail={t("kpi.costsBreakdownExact", { direct: formatMoney(p.monthly.directCosts, c), labour: formatMoney(p.monthly.labour, c) })} />
        <KpiCard label={t("kpi.monthlyProfit")} value={formatMoney(p.monthly.profit, c)} />
        <KpiCard label={t("kpi.margin")} value={formatPercent(p.margin)} />
        <KpiCard label={t("kpi.yearlyRevenue")} value={formatMoney(p.annual.revenue, c)} />
        <KpiCard label={t("kpi.yearlyProfit")} value={formatMoney(p.annual.profit, c)} />
      </section>
    </div>
  );
}
