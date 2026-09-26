"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signUpAction } from "@/server/actions/auth";
import { FormField } from "./form-field";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4">
      <FormField name="name" label="Your name" autoComplete="name" errors={e?.name} defaultValue={state?.values?.name} />
      <FormField name="companyName" label="Company name" autoComplete="organization" errors={e?.companyName} defaultValue={state?.values?.companyName} />
      <FormField name="email" label="Email" type="email" autoComplete="email" errors={e?.email} defaultValue={state?.values?.email} />
      <FormField name="password" label="Password" type="password" autoComplete="new-password" errors={e?.password} />
      {state?.error && <p role="alert" className="text-sm text-critical">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
      <p className="text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="text-foreground underline underline-offset-4">Sign in</Link>
      </p>
    </form>
  );
}
