import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { ClientStatusBadge, MarginStatusBadge } from "@/components/dashboard/status-badges";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney, formatPercent } from "@/lib/format";
import { archiveClientAction, deleteClientAction } from "@/server/actions/clients";
import type { ClientDetail } from "@/server/services/clients";

export function ClientHeader({ detail }: { detail: ClientDetail }) {
  const { client, profitability: p, settings } = detail;
  const c = settings.currency;
  const archived = client.archivedAt !== null;
  return (
    <div className="space-y-6">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> Clients
      </Link>
      {archived && (
        <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          This client is archived. It is excluded from the dashboard and company totals.
        </p>
      )}
      <PageHeader
        title={client.companyName}
        actions={
          <>
            <Link href={`/clients/${client.id}/edit` as Route} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Edit
            </Link>
            <form action={archiveClientAction}>
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="archive" value={archived ? "false" : "true"} />
              <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {archived ? "Unarchive" : "Archive"}
              </button>
            </form>
            <ConfirmButton
              action={deleteClientAction}
              fields={{ clientId: client.id }}
              label="Delete"
              confirmLabel="Delete permanently"
              message="Deletes the client and all its services, domains, hosting, costs and time."
            />
          </>
        }
      >
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ClientStatusBadge status={client.status} />
          <MarginStatusBadge status={p.status} />
          {archived && <Badge variant="neutral">Archived</Badge>}
        </div>
      </PageHeader>
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Monthly revenue" value={formatMoney(p.monthly.revenue, c)} />
        <KpiCard label="Monthly costs" value={formatMoney(p.monthly.directCosts.plus(p.monthly.labour), c)} detail={`${formatMoney(p.monthly.directCosts, c)} direct · ${formatMoney(p.monthly.labour, c)} labour`} />
        <KpiCard label="Monthly profit" value={formatMoney(p.monthly.profit, c)} />
        <KpiCard label="Margin" value={formatPercent(p.margin)} />
        <KpiCard label="Yearly revenue" value={formatMoney(p.annual.revenue, c)} />
        <KpiCard label="Yearly profit" value={formatMoney(p.annual.profit, c)} />
      </section>
    </div>
  );
}
