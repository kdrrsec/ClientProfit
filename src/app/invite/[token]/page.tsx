import type { Metadata, Route } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AcceptInviteForm } from "@/components/team/accept-invite-form";
import { buttonVariants } from "@/components/ui/button";
import { inviteTokenSchema } from "@/lib/validation/team";
import { getSession } from "@/server/auth/context";
import { findValidInvitation, isMember } from "@/server/repositories/team";

export const metadata: Metadata = { title: "Invitation" };

const ROLE = { OWNER: "owner", ADMIN: "admin", MEMBER: "member" } as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = inviteTokenSchema.safeParse(token);
  const invite = parsed.success ? await findValidInvitation(parsed.data) : null;

  if (!invite) {
    return (
      <AuthCard title="Invitation not valid" description="This link has expired, was already used, or was revoked. Ask for a new invitation.">
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Go to sign in
        </Link>
      </AuthCard>
    );
  }

  const session = await getSession();
  const description = `You've been invited to join ${invite.organization.name} on ClientProfit as ${ROLE[invite.role]}.`;

  if (!session) {
    return (
      <AuthCard title={`Join ${invite.organization.name}`} description={description}>
        <p className="mb-4 text-sm text-muted-foreground">
          This invitation is for <span className="font-medium text-foreground">{invite.email}</span>.
        </p>
        <div className="flex flex-col gap-2">
          <Link href={`/signup?invite=${token}` as Route} className={buttonVariants()}>
            Create an account
          </Link>
          <Link href={`/login?invite=${token}` as Route} className={buttonVariants({ variant: "outline" })}>
            I already have an account
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (await isMember(session.user.id, invite.organizationId)) {
    return (
      <AuthCard title="You're already a member" description={`You already have access to ${invite.organization.name}.`}>
        <Link href="/dashboard" className={buttonVariants()}>
          Go to dashboard
        </Link>
      </AuthCard>
    );
  }

  const emailMatches = session.user.email.toLowerCase() === invite.email.toLowerCase();
  return (
    <AuthCard title={`Join ${invite.organization.name}`} description={description}>
      {emailMatches ? (
        <AcceptInviteForm token={token} organizationName={invite.organization.name} />
      ) : (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-sm text-critical">
          You&apos;re signed in as {session.user.email}, but this invitation is for {invite.email}. Sign out and sign in with that address.
        </p>
      )}
    </AuthCard>
  );
}
