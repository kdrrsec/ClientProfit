import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getI18n } from "@/i18n/server";
import { inviteTokenSchema } from "@/lib/validation/team";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("auth.signInTitle") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { t } = await getI18n();
  const { invite } = await searchParams;
  const token = inviteTokenSchema.safeParse(invite).success ? invite : undefined;
  return (
    <AuthCard title={t("auth.signInTitle")} description={t("meta.tagline")}>
      <LoginForm invite={token} />
    </AuthCard>
  );
}
