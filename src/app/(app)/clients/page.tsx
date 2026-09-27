import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClientsTable, clientsHref } from "@/components/clients/clients-table";
import { Pagination } from "@/components/clients/pagination";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CLIENT_STATUSES, enumOptions } from "@/lib/labels";
import { getI18n } from "@/i18n/server";
import { clientListParams } from "@/lib/validation/client-list";
import { requireOrgContext } from "@/server/auth/context";
import { CLIENT_PAGE_SIZE, listClients } from "@/server/services/clients";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("clients.title") };
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireOrgContext();
  const { t } = await getI18n();
  const params = clientListParams.parse(await searchParams);
  const dir = params.dir ?? (params.sort === "name" ? "asc" : "desc");
  const archived = params.status === "ARCHIVED";

  const result = await listClients(ctx, {
    search: params.q,
    status: params.status === "ARCHIVED" ? undefined : params.status,
    archived,
    sort: params.sort,
    direction: dir,
    page: params.page,
  });

  const base = { q: params.q, status: params.status };
  const filtered = Boolean(params.q || params.status);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title={t("clients.title")}
        description={t("clients.description")}
        actions={
          <Link href="/clients/new" className={buttonVariants()}>
            <Plus aria-hidden /> {t("clients.add")}
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form className="flex flex-col gap-2 sm:flex-row" role="search" action="/clients">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input name="q" defaultValue={params.q} placeholder={t("clients.searchPlaceholder")} aria-label={t("clients.searchLabel")} className="pl-9" />
            </div>
            <div className="sm:w-44">
              <Select name="status" defaultValue={params.status ?? ""} aria-label={t("common.status")}>
                <option value="">{t("common.allStatuses")}</option>
                {enumOptions(t, "clientStatus", CLIENT_STATUSES).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value="ARCHIVED">{t("common.archived")}</option>
              </Select>
            </div>
            <input type="hidden" name="sort" value={params.sort} />
            <input type="hidden" name="dir" value={dir} />
            <Button type="submit" variant="outline">{t("common.filter")}</Button>
            {filtered && (
              <Link href="/clients" className={buttonVariants({ variant: "ghost" })}>
                {t("common.reset")}
              </Link>
            )}
          </form>
        </CardContent>
        <CardContent className="px-2">
          {result.total === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {filtered ? t("clients.noMatch") : t("clients.emptyState")}
            </p>
          ) : (
            <>
              <ClientsTable rows={result.rows} currency={result.currency} current={{ sort: params.sort, dir }} base={base} />
              <div className="px-3">
                <Pagination
                  page={result.page}
                  pageCount={result.pageCount}
                  total={result.total}
                  pageSize={CLIENT_PAGE_SIZE}
                  href={(page) => clientsHref({ ...base, sort: params.sort, dir, page })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
