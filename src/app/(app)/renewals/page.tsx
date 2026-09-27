import { AlertCircle, AlertTriangle } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { z } from "zod";
import { PageHeader } from "@/components/app-shell/page-header";
import { Empty } from "@/components/client-detail/section";
import { tabHref, type ClientTab } from "@/components/client-detail/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { sectionHref } from "@/components/sections/section-href";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, formatRelativeDays } from "@/lib/format";
import type { RenewalKind } from "@/lib/renewals";
import { cn } from "@/lib/utils";
import type { SearchParams } from "@/lib/validation/section-params";
import { requireOrgContext } from "@/server/auth/context";
import { getRenewals, RENEWAL_WINDOWS } from "@/server/services/renewals";

export const metadata: Metadata = { title: "Renewals" };

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const params = z.object({
  days: z.preprocess(first, z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(30)).catch(30),
  kind: z.preprocess(first, z.enum(["DOMAIN", "HOSTING", "SERVICE", "COST", "CONTRACT"]).optional()).catch(undefined),
  client: z.preprocess(first, z.string().regex(/^[a-z0-9]{1,64}$/i).optional()).catch(undefined),
});

const KIND: Record<RenewalKind, { label: string; tab: ClientTab }> = {
  DOMAIN: { label: "Domain", tab: "domains" },
  HOSTING: { label: "Hosting", tab: "hosting" },
  SERVICE: { label: "Service ends", tab: "services" },
  COST: { label: "Software / cost", tab: "costs" },
  CONTRACT: { label: "Contract", tab: "overview" },
};

function Urgency({ days }: { days: number }) {
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-critical">
        <AlertCircle className="size-3.5" aria-hidden /> {formatRelativeDays(days)}
      </span>
    );
  if (days <= 7)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
        <AlertTriangle className="size-3.5" aria-hidden /> {formatRelativeDays(days)}
      </span>
    );
  return <span className="text-xs text-muted-foreground">{formatRelativeDays(days)}</span>;
}

export default async function RenewalsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = params.parse(await searchParams);
  const data = await getRenewals(ctx, { window: p.days, kind: p.kind, clientId: p.client });
  const c = data.settings.currency;
  const base = { kind: p.kind, client: p.client };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Renewals"
        description={`Domains, hosting, software, ending services and contracts, as of ${formatDate(data.settings.today)}. Overdue items stay listed until you update them.`}
      />
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Overdue" value={String(data.counts.overdue)} />
        <KpiCard label="Next 7 days" value={String(data.counts[7])} />
        <KpiCard label="Next 30 days" value={String(data.counts[30])} />
        <KpiCard label="Next 90 days" value={String(data.counts[90])} />
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Period" className="flex flex-wrap gap-2">
            {RENEWAL_WINDOWS.map((d) => (
              <Link
                key={d}
                href={sectionHref("/renewals", { ...base, days: d === 30 ? undefined : d })}
                aria-current={p.days === d ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-md border px-3 text-xs whitespace-nowrap",
                  p.days === d ? "border-foreground bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                Next {d} days
              </Link>
            ))}
          </nav>
          <form action="/renewals" className="flex flex-col gap-2 sm:flex-row">
            {p.days !== 30 && <input type="hidden" name="days" value={p.days} />}
            <div className="sm:w-44">
              <Select name="kind" defaultValue={p.kind ?? ""} aria-label="Type">
                <option value="">All types</option>
                {(Object.keys(KIND) as RenewalKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND[k].label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:w-52">
              <Select name="client" defaultValue={p.client ?? ""} aria-label="Client">
                <option value="">All clients</option>
                {data.clientOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>Nothing renews in the next {p.days} days.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Auto-renew</TableHead>
                  <TableHead className="text-right">Yearly value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={`${r.kind}-${r.id}`} className={r.daysUntil < 0 ? "bg-critical-bg/40" : undefined}>
                    <TableCell>
                      <div className="text-sm tabular-nums">{formatDate(r.date)}</div>
                      <Urgency days={r.daysUntil} />
                    </TableCell>
                    <TableCell><Badge variant="neutral">{KIND[r.kind].label}</Badge></TableCell>
                    <TableCell>
                      <Link href={tabHref(r.clientId, KIND[r.kind].tab)} className="font-medium underline-offset-4 hover:underline">
                        {r.label}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${r.clientId}` as Route} className="text-sm underline-offset-4 hover:underline">
                        {r.clientName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.autoRenew === null ? "—" : r.autoRenew ? "On" : <span className="font-medium text-warning">Off</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.yearlyValue ? (
                        <>
                          {formatMoney(r.yearlyValue, c)}
                          <div className="text-xs text-muted-foreground">{r.valueKind === "cost" ? "cost" : r.kind === "CONTRACT" ? "client revenue" : "revenue"}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
