import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OrganizationForm } from "@/components/auth/organization-form";
import { getI18n } from "@/i18n/server";
import { getOrgContext, requireUser } from "@/server/auth/context";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("onboarding.title") };
}

export default async function OnboardingPage() {
  await requireUser();
  if (await getOrgContext()) redirect("/dashboard");
  const { t } = await getI18n();
  return (
    <AuthCard title={t("onboarding.title")} description={t("onboarding.description")}>
      <OrganizationForm />
    </AuthCard>
  );
}
