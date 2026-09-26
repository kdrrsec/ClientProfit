import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app-shell/page-header";
import { ProfitBreakdown } from "@/components/client-detail/summary-tabs";
import { tabHref } from "@/components/client-detail/tabs";
import { SETUP_STEPS, SetupSteps, setupHref, type SetupStep } from "@/components/clients/setup-steps";
import { CostForm } from "@/components/records/cost-form";
import { costDefaults, domainDefaults, hostingDefaults, isoDate, serviceDefaults } from "@/components/records/defaults";
import { DomainForm } from "@/components/records/domain-form";
import { HostingForm } from "@/components/records/hosting-form";
import { ServiceForm } from "@/components/records/service-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { BILLING_INTERVAL_SUFFIX } from "@/lib/labels";
import { addYears, toMoney } from "@/lib/profitability";
import { requireOrgContext } from "@/server/auth/context";
import { NotFoundError } from "@/server/errors";
import { getClientDetail } from "@/server/services/clients";

export const metadata: Metadata = { title: "Set up client" };

const FORM_STEPS = ["services", "costs", "domains", "hosting"] as const;
type FormStep = (typeof FORM_STEPS)[number];

const COPY: Record<FormStep, { title: string; description: string; add: string }> = {
  services: { title: "What does this client pay you for?", description: "Website, maintenance, SEO… Add each service with its price and any supplier cost.", add: "Add service" },
  costs: { title: "Any other costs for this client?", description: "Subscriptions, plugins, freelancers or tools you pay for on behalf of this client.", add: "Add cost" },
  domains: { title: "Domains", description: "Domains you register or renew for this client.", add: "Add domain" },
  hosting: { title: "Hosting", description: "Hosting products you resell to this client.", add: "Add hosting" },
};

export default async function SetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { clientId } = await params;
  const { step: rawStep } = await searchParams;
  const step: FormStep | "done" =
    rawStep === "done" || FORM_STEPS.some((s) => s === rawStep) ? (rawStep as FormStep | "done") : "services";
  const ctx = await requireOrgContext();
  const detail = await getClientDetail(ctx, clientId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const currency = settings.currency;
  const nextStep: SetupStep = SETUP_STEPS[SETUP_STEPS.findIndex((s) => s.id === step) + 1]?.id ?? "done";
  const formProps = { clientId, returnTo: setupHref(clientId, step), currency, submitLabel: step === "services" ? "Add service" : undefined };

  const added: { key: string; label: string; amount: string }[] =
    step === "services"
      ? client.services.map((s) => ({ key: s.id, label: s.name, amount: `${formatMoney(toMoney(s.sellingPrice), currency)} ${BILLING_INTERVAL_SUFFIX[s.billingInterval]}` }))
      : step === "costs"
        ? client.costs.map((c) => ({ key: c.id, label: c.name, amount: `${formatMoney(toMoney(c.amount), currency)} ${BILLING_INTERVAL_SUFFIX[c.billingInterval]}` }))
        : step === "domains"
          ? client.domains.map((d) => ({ key: d.id, label: d.domain, amount: `${formatMoney(toMoney(d.sellingPrice), currency)} / year` }))
          : step === "hosting"
            ? client.hosting.map((h) => ({ key: h.id, label: h.product, amount: `${formatMoney(toMoney(h.sellingPrice), currency)} ${BILLING_INTERVAL_SUFFIX[h.billingInterval]}` }))
            : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={client.companyName} description="Set up this client in a few steps. You can skip any step and add things later." />
      <SetupSteps current={step} clientId={clientId} />

      {step === "done" ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>All set</CardTitle>
              <CardDescription>This is what {client.companyName} makes you per month, based on what you entered.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProfitBreakdown detail={detail} />
            <p className="text-xs text-muted-foreground">Log time on the client page to include labour in the profit calculation.</p>
            <Link href={tabHref(clientId, "overview")} className={buttonVariants()}>
              Open client <ArrowRight aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{COPY[step].title}</CardTitle>
              <CardDescription>{COPY[step].description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {added.length > 0 && (
              <ul className="divide-y rounded-md border" aria-label="Added so far">
                {added.map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                    <span className="font-medium">{a.label}</span>
                    <span className="tabular-nums text-muted-foreground">{a.amount}</span>
                  </li>
                ))}
              </ul>
            )}
            {step === "services" && <ServiceForm key={added.length} {...formProps} defaults={serviceDefaults(undefined, today, settings.defaultBillingInterval)} />}
            {step === "costs" && <CostForm key={added.length} {...formProps} submitLabel="Add cost" defaults={costDefaults(undefined, today, settings.defaultBillingInterval)} />}
            {step === "domains" && <DomainForm key={added.length} {...formProps} submitLabel="Add domain" defaults={domainDefaults(undefined, today, isoDate(addYears(settings.today, 1)))} />}
            {step === "hosting" && <HostingForm key={added.length} {...formProps} submitLabel="Add hosting" defaults={hostingDefaults(undefined, today, settings.defaultBillingInterval)} />}
            <div className="flex justify-end border-t pt-4">
              <Link href={setupHref(clientId, nextStep)} className={buttonVariants({ variant: added.length > 0 ? "default" : "outline" })}>
                {added.length > 0 ? "Continue" : "Skip"} <ArrowRight aria-hidden />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
