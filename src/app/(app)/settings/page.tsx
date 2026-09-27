import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireOrgContext } from "@/server/auth/context";
import { getOrganization } from "@/server/repositories/organizations";

export const metadata: Metadata = { title: "Settings" };

const pct = (v: { toString(): string }) => v.toString().replace(".", ",");

export default async function SettingsPage() {
  const ctx = await requireOrgContext();
  const org = await getOrganization(ctx);
  const timezones = Intl.supportedValuesOf("timeZone");
  if (!timezones.includes(org.timezone)) timezones.unshift(org.timezone);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Settings" description="Company details and the defaults behind every profit calculation." />
      <SettingsForm
        canEdit={ctx.role !== "MEMBER"}
        timezones={timezones}
        defaults={{
          name: org.name,
          logoUrl: org.logoUrl ?? "",
          currency: org.currency,
          timezone: org.timezone,
          defaultHourlyCost: org.defaultHourlyCost.toFixed(2).replace(".", ","),
          lowMarginThreshold: pct(org.lowMarginThreshold),
          negativeMarginThreshold: pct(org.negativeMarginThreshold),
          labourWindowMonths: String(org.labourWindowMonths),
          defaultBillingInterval: org.defaultBillingInterval,
        }}
      />
    </main>
  );
}
