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
import { getI18n } from "@/i18n/server";
import { addYears, toMoney } from "@/lib/profitability";
import { requireOrgContext } from "@/server/auth/context";
import { NotFoundError } from "@/server/errors";
import { getClientDetail } from "@/server/services/clients";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("setup.meta") };
}

const FORM_STEPS = ["services", "costs", "domains", "hosting"] as const;
const SUFFIX = {
  ONE_TIME: "intervalSuffix.ONE_TIME",
  MONTHLY: "intervalSuffix.MONTHLY",
  QUARTERLY: "intervalSuffix.QUARTERLY",
  YEARLY: "intervalSuffix.YEARLY",
} as const;
type FormStep = (typeof FORM_STEPS)[number];


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
  const { t } = await getI18n();
  const per = (interval: keyof typeof SUFFIX) => t(SUFFIX[interval]);
  const today = isoDate(settings.today);
  const currency = settings.currency;
  const nextStep: SetupStep = SETUP_STEPS[SETUP_STEPS.findIndex((s) => s.id === step) + 1]?.id ?? "done";
  const formProps = { clientId, returnTo: setupHref(clientId, step), currency };

  const added: { key: string; label: string; amount: string }[] =
    step === "services"
      ? client.services.map((s) => ({ key: s.id, label: s.name, amount: `${formatMoney(toMoney(s.sellingPrice), currency)} ${per(s.billingInterval)}` }))
      : step === "costs"
        ? client.costs.map((c) => ({ key: c.id, label: c.name, amount: `${formatMoney(toMoney(c.amount), currency)} ${per(c.billingInterval)}` }))
        : step === "domains"
          ? client.domains.map((d) => ({ key: d.id, label: d.domain, amount: t("common.perYear", { value: formatMoney(toMoney(d.sellingPrice), currency) }) }))
          : step === "hosting"
            ? client.hosting.map((h) => ({ key: h.id, label: h.product, amount: `${formatMoney(toMoney(h.sellingPrice), currency)} ${per(h.billingInterval)}` }))
            : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={client.companyName} description={t("setup.description")} />
      <SetupSteps current={step} clientId={clientId} />

      {step === "done" ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("setup.done.title")}</CardTitle>
              <CardDescription>{t("setup.done.description", { name: client.companyName })}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ProfitBreakdown detail={detail} />
            <p className="text-xs text-muted-foreground">{t("setup.done.logTime")}</p>
            <Link href={tabHref(clientId, "overview")} className={buttonVariants()}>
              {t("setup.openClient")} <ArrowRight aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t(`setup.${step}.title`)}</CardTitle>
              <CardDescription>{t(`setup.${step}.description`)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {added.length > 0 && (
              <ul className="divide-y rounded-md border" aria-label={t("setup.addedSoFar")}>
                {added.map((a) => (
                  <li key={a.key} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                    <span className="font-medium">{a.label}</span>
                    <span className="tabular-nums text-muted-foreground">{a.amount}</span>
                  </li>
                ))}
              </ul>
            )}
            {step === "services" && <ServiceForm key={added.length} {...formProps} submitLabel={t("add.service")} defaults={serviceDefaults(undefined, today, settings.defaultBillingInterval)} />}
            {step === "costs" && <CostForm key={added.length} {...formProps} submitLabel={t("add.cost")} defaults={costDefaults(undefined, today, settings.defaultBillingInterval)} />}
            {step === "domains" && <DomainForm key={added.length} {...formProps} submitLabel={t("add.domain")} defaults={domainDefaults(undefined, today, isoDate(addYears(settings.today, 1)))} />}
            {step === "hosting" && <HostingForm key={added.length} {...formProps} submitLabel={t("add.hosting")} defaults={hostingDefaults(undefined, today, settings.defaultBillingInterval)} />}
            <div className="flex justify-end border-t pt-4">
              <Link href={setupHref(clientId, nextStep)} className={buttonVariants({ variant: added.length > 0 ? "default" : "outline" })}>
                {added.length > 0 ? t("common.continue") : t("common.skip")} <ArrowRight aria-hidden />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
