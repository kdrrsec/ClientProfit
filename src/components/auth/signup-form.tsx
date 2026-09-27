"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/server/actions/auth";
import { FormField } from "./form-field";

/** Without an invite a new company is created; with one, the account joins the inviting organization. */
export function SignupForm({ invite }: { invite?: { token: string; email: string } }) {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4">
      <FormField name="name" label="Your name" autoComplete="name" errors={e?.name} defaultValue={state?.values?.name} />
      {invite ? (
        <>
          <input type="hidden" name="invite" value={invite.token} />
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={invite.email} readOnly className="bg-muted" />
          </div>
        </>
      ) : (
        <>
          <FormField name="companyName" label="Company name" autoComplete="organization" errors={e?.companyName} defaultValue={state?.values?.companyName} />
          <FormField name="email" label="Email" type="email" autoComplete="email" errors={e?.email} defaultValue={state?.values?.email} />
        </>
      )}
      <FormField name="password" label="Password" type="password" autoComplete="new-password" errors={e?.password} />
      {state?.error && <p role="alert" className="text-sm text-critical">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating account…" : invite ? "Create account and join" : "Create account"}</Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={invite ? (`/login?invite=${invite.token}` as Route) : "/login"} className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
