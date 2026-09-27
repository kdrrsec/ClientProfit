import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { inviteTokenSchema } from "@/lib/validation/team";
import { findValidInvitation } from "@/server/repositories/team";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const parsed = inviteTokenSchema.safeParse(invite);
  const invitation = parsed.success ? await findValidInvitation(parsed.data) : null;
  if (invitation) {
    return (
      <AuthCard title={`Join ${invitation.organization.name}`} description="Create your account to accept the invitation.">
        <SignupForm invite={{ token: parsed.data!, email: invitation.email }} />
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Create your account" description="Your company gets its own private workspace.">
      <SignupForm />
    </AuthCard>
  );
}
