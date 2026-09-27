import type { Metadata, Route } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AcceptInviteForm } from "@/components/team/accept-invite-form";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import { inviteTokenSchema } from "@/lib/validation/team";
import { getSession } from "@/server/auth/context";
import { findValidInvitation, isMember } from "@/server/repositories/team";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("invite.meta") };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getI18n();
  const parsed = inviteTokenSchema.safeParse(token);
  const invite = parsed.success ? await findValidInvitation(parsed.data) : null;

  if (!invite) {
    return (
      <AuthCard title={t("invite.invalidTitle")} description={t("invite.invalidDesc")}>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          {t("invite.goToSignIn")}
        </Link>
      </AuthCard>
    );
  }

  const session = await getSession();
  const org = invite.organization.name;
  const description = t("invite.description", { org, role: t(`roleLower.${invite.role}`) });

  if (!session) {
    return (
      <AuthCard title={t("invite.join", { org })} description={description}>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("invite.for", { email: invite.email })}
        </p>
        <div className="flex flex-col gap-2">
          <Link href={`/signup?invite=${token}` as Route} className={buttonVariants()}>
            {t("invite.createAccount")}
          </Link>
          <Link href={`/login?invite=${token}` as Route} className={buttonVariants({ variant: "outline" })}>
            {t("invite.haveAccount")}
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (await isMember(session.user.id, invite.organizationId)) {
    return (
      <AuthCard title={t("invite.alreadyMemberTitle")} description={t("invite.alreadyMemberDesc", { org })}>
        <Link href="/dashboard" className={buttonVariants()}>
          {t("invite.goToDashboard")}
        </Link>
      </AuthCard>
    );
  }

  const emailMatches = session.user.email.toLowerCase() === invite.email.toLowerCase();
  return (
    <AuthCard title={t("invite.join", { org })} description={description}>
      {emailMatches ? (
        <AcceptInviteForm token={token} organizationName={invite.organization.name} />
      ) : (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-sm text-critical">
          {t("invite.wrongAccount", { current: session.user.email, email: invite.email })}
        </p>
      )}
    </AuthCard>
  );
}
