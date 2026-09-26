import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ClientHeader } from "@/components/client-detail/client-header";
import { DomainsTab, HostingTab, ServicesTab, TimeTab, type TabMode } from "@/components/client-detail/record-tabs";
import { CostsTab, NotesTab, OverviewTab, ProfitabilityTab, RevenueTab } from "@/components/client-detail/summary-tabs";
import { TabNav } from "@/components/client-detail/tab-nav";
import { isClientTab, type ClientTab } from "@/components/client-detail/tabs";
import { requireOrgContext } from "@/server/auth/context";
import { NotFoundError } from "@/server/errors";
import { getClientDetail, type ClientDetail } from "@/server/services/clients";

type Params = { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Cached per request: generateMetadata and the page share one load. */
const load = cache(async (clientId: string): Promise<ClientDetail> => {
  const ctx = await requireOrgContext();
  try {
    return await getClientDetail(ctx, clientId);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { clientId } = await params;
  const detail = await load(clientId);
  return { title: detail.client.companyName };
}

export default async function ClientPage({ params, searchParams }: Params) {
  const { clientId } = await params;
  const sp = await searchParams;
  const tab: ClientTab = isClientTab(sp.tab) ? sp.tab : "overview";
  const mode: TabMode = { isNew: sp.new === "1", editId: typeof sp.edit === "string" ? sp.edit : null };
  const detail = await load(clientId);
  const { client } = detail;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <ClientHeader detail={detail} />
      <TabNav
        clientId={client.id}
        active={tab}
        counts={{
          services: client.services.length,
          domains: client.domains.length,
          hosting: client.hosting.length,
          costs: detail.costLines.length,
          time: client.timeEntries.length,
        }}
      />
      {tab === "overview" && <OverviewTab detail={detail} />}
      {tab === "revenue" && <RevenueTab detail={detail} />}
      {tab === "costs" && <CostsTab detail={detail} mode={mode} />}
      {tab === "services" && <ServicesTab detail={detail} mode={mode} />}
      {tab === "domains" && <DomainsTab detail={detail} mode={mode} />}
      {tab === "hosting" && <HostingTab detail={detail} mode={mode} />}
      {tab === "time" && <TimeTab detail={detail} mode={mode} />}
      {tab === "profitability" && <ProfitabilityTab detail={detail} />}
      {tab === "notes" && <NotesTab detail={detail} />}
    </main>
  );
}
