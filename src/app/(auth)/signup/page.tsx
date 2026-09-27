import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { getI18n } from "@/i18n/server";
import { inviteTokenSchema } from "@/lib/validation/team";
import { findValidInvitation } from "@/server/repositories/team";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("auth.signUpMeta") };
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { t } = await getI18n();
  const { invite } = await searchParams;
  const parsed = inviteTokenSchema.safeParse(invite);
  const invitation = parsed.success ? await findValidInvitation(parsed.data) : null;
  if (invitation) {
    return (
      <AuthCard title={t("auth.joinTitle", { org: invitation.organization.name })} description={t("auth.joinDescription")}>
        <SignupForm invite={{ token: parsed.data!, email: invitation.email }} />
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t("auth.signUpTitle")} description={t("auth.signUpDescription")}>
      <SignupForm />
    </AuthCard>
  );
}
