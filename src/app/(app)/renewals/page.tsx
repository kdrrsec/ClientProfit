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
import { getI18n } from "@/i18n/server";
import type { T } from "@/i18n/translate";
import { requireOrgContext } from "@/server/auth/context";
import { getRenewals, RENEWAL_WINDOWS } from "@/server/services/renewals";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("nav.renewals") };
}

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const params = z.object({
  days: z.preprocess(first, z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(30)).catch(30),
  kind: z.preprocess(first, z.enum(["DOMAIN", "HOSTING", "SERVICE", "COST", "CONTRACT"]).optional()).catch(undefined),
  client: z.preprocess(first, z.string().regex(/^[a-z0-9]{1,64}$/i).optional()).catch(undefined),
});

const KIND_TAB: Record<RenewalKind, ClientTab> = { DOMAIN: "domains", HOSTING: "hosting", SERVICE: "services", COST: "costs", CONTRACT: "overview" };
const KINDS = Object.keys(KIND_TAB) as RenewalKind[];

function Urgency({ days, t }: { days: number; t: T }) {
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-critical">
        <AlertCircle className="size-3.5" aria-hidden /> {formatRelativeDays(days, t)}
      </span>
    );
  if (days <= 7)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warning">
        <AlertTriangle className="size-3.5" aria-hidden /> {formatRelativeDays(days, t)}
      </span>
    );
  return <span className="text-xs text-muted-foreground">{formatRelativeDays(days, t)}</span>;
}

export default async function RenewalsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireOrgContext();
  const p = params.parse(await searchParams);
  const data = await getRenewals(ctx, { window: p.days, kind: p.kind, clientId: p.client });
  const c = data.settings.currency;
  const { t, locale } = await getI18n();
  const base = { kind: p.kind, client: p.client };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title={t("nav.renewals")}
        description={t("renewalsPage.description", { date: formatDate(data.settings.today, locale) })}
      />
      <section aria-label={t("a11y.keyFigures")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t("renewalsPage.overdue")} value={String(data.counts.overdue)} />
        <KpiCard label={t("renewalsPage.nextDays", { n: 7 })} value={String(data.counts[7])} />
        <KpiCard label={t("renewalsPage.nextDays", { n: 30 })} value={String(data.counts[30])} />
        <KpiCard label={t("renewalsPage.nextDays", { n: 90 })} value={String(data.counts[90])} />
      </section>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label={t("renewalsPage.period")} className="flex flex-wrap gap-2">
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
                {t("renewalsPage.nextDays", { n: d })}
              </Link>
            ))}
          </nav>
          <form action="/renewals" className="flex flex-col gap-2 sm:flex-row">
            {p.days !== 30 && <input type="hidden" name="days" value={p.days} />}
            <div className="sm:w-44">
              <Select name="kind" defaultValue={p.kind ?? ""} aria-label={t("col.type")}>
                <option value="">{t("common.allTypes")}</option>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`renewalKind.${k}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:w-52">
              <Select name="client" defaultValue={p.client ?? ""} aria-label={t("common.client")}>
                <option value="">{t("common.allClients")}</option>
                {data.clientOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">{t("common.filter")}</Button>
          </form>
        </CardContent>
        <CardContent className="px-2">
          {data.rows.length === 0 ? (
            <Empty>{t("renewalsPage.empty", { n: p.days })}</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col.date")}</TableHead>
                  <TableHead>{t("col.type")}</TableHead>
                  <TableHead>{t("col.item")}</TableHead>
                  <TableHead>{t("table.client")}</TableHead>
                  <TableHead>{t("col.autoRenew")}</TableHead>
                  <TableHead className="text-right">{t("col.yearlyValue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={`${r.kind}-${r.id}`} className={r.daysUntil < 0 ? "bg-critical-bg/40" : undefined}>
                    <TableCell>
                      <div className="text-sm tabular-nums">{formatDate(r.date, locale)}</div>
                      <Urgency days={r.daysUntil} t={t} />
                    </TableCell>
                    <TableCell><Badge variant="neutral">{t(`renewalKind.${r.kind}`)}</Badge></TableCell>
                    <TableCell>
                      <Link href={tabHref(r.clientId, KIND_TAB[r.kind])} className="font-medium underline-offset-4 hover:underline">
                        {r.kind === "CONTRACT" ? t("renewals.contractRenewal") : r.label}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${r.clientId}` as Route} className="text-sm underline-offset-4 hover:underline">
                        {r.clientName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.autoRenew === null ? "—" : r.autoRenew ? t("renewalsPage.on") : <span className="font-medium text-warning">{t("renewalsPage.off")}</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.yearlyValue ? (
                        <>
                          {formatMoney(r.yearlyValue, c)}
                          <div className="text-xs text-muted-foreground">{t(r.valueKind === "cost" ? "renewalsPage.value.cost" : r.kind === "CONTRACT" ? "renewalsPage.value.clientRevenue" : "renewalsPage.value.revenue")}</div>
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
