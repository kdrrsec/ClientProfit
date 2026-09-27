import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { clientDefaults } from "@/components/records/defaults";
import { Card, CardContent } from "@/components/ui/card";
import { getI18n } from "@/i18n/server";
import { requireOrgContext } from "@/server/auth/context";
import { NotFoundError } from "@/server/errors";
import { getClient } from "@/server/repositories/clients";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("clientEdit.meta") };
}

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const ctx = await requireOrgContext();
  const { t } = await getI18n();
  const client = await getClient(ctx, clientId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={t("clientEdit.title", { name: client.companyName })} />
      <Card>
        <CardContent className="pt-5">
          <ClientForm clientId={client.id} defaults={clientDefaults(client)} cancelHref={`/clients/${client.id}` as Route} />
        </CardContent>
      </Card>
    </main>
  );
}
