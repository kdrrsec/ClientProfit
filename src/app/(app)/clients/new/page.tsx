import type { Metadata, Route } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { QuickClientForm } from "@/components/clients/quick-client-form";
import { SetupSteps } from "@/components/clients/setup-steps";
import { clientDefaults, isoDate } from "@/components/records/defaults";
import { Card, CardContent } from "@/components/ui/card";
import { getI18n } from "@/i18n/server";
import { requireOrgContext } from "@/server/auth/context";
import { getFinancialSettings } from "@/server/services/profitability";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("clientNew.title") };
}

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ full?: string }> }) {
  const settings = await getFinancialSettings(await requireOrgContext());
  const { t } = await getI18n();
  const full = (await searchParams).full === "1";
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={t("clientNew.title")} description={full ? t("clientNew.description") : t("quick.description")} />
      <SetupSteps current="client" />
      <Card>
        <CardContent className="pt-5">
          {full ? (
            <ClientForm defaults={clientDefaults(undefined, isoDate(settings.today))} cancelHref="/clients" />
          ) : (
            <QuickClientForm currency={settings.currency} cancelHref="/clients" />
          )}
        </CardContent>
      </Card>
      <p className="text-sm">
        <Link href={(full ? "/clients/new" : "/clients/new?full=1") as Route} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
          {full ? t("quick.quickForm") : t("quick.fullForm")}
        </Link>
      </p>
    </main>
  );
}
