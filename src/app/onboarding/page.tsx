import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OrganizationForm } from "@/components/auth/organization-form";
import { getOrgContext, requireUser } from "@/server/auth/context";

export const metadata: Metadata = { title: "Set up your company" };

export default async function OnboardingPage() {
  await requireUser();
  if (await getOrgContext()) redirect("/dashboard");
  return (
    <AuthCard title="Set up your company" description="All clients and figures are stored in this workspace.">
      <OrganizationForm />
    </AuthCard>
  );
}
