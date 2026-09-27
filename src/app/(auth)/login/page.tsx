import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { inviteTokenSchema } from "@/lib/validation/team";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const token = inviteTokenSchema.safeParse(invite).success ? invite : undefined;
  return (
    <AuthCard title="Sign in" description="Know exactly what every client makes you.">
      <LoginForm invite={token} />
    </AuthCard>
  );
}
