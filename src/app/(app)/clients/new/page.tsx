import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { SetupSteps } from "@/components/clients/setup-steps";
import { clientDefaults, isoDate } from "@/components/records/defaults";
import { Card, CardContent } from "@/components/ui/card";
import { requireOrgContext } from "@/server/auth/context";
import { getFinancialSettings } from "@/server/services/profitability";

export const metadata: Metadata = { title: "Add client" };

export default async function NewClientPage() {
  const settings = await getFinancialSettings(await requireOrgContext());
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Add client" description="Start with the basics. Next you'll add services, costs, domains and hosting." />
      <SetupSteps current="client" />
      <Card>
        <CardContent className="pt-5">
          <ClientForm defaults={clientDefaults(undefined, isoDate(settings.today))} cancelHref="/clients" />
        </CardContent>
      </Card>
    </main>
  );
}
