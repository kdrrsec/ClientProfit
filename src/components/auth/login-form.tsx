"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/server/actions/auth";
import { FormField } from "./form-field";

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form action={action} className="grid gap-4">
      <FormField name="email" label="Email" type="email" autoComplete="email" errors={state?.fieldErrors?.email} defaultValue={state?.values?.email} />
      <FormField name="password" label="Password" type="password" autoComplete="current-password" errors={state?.fieldErrors?.password} />
      {state?.error && <p role="alert" className="text-sm text-critical">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      <p className="text-sm text-muted-foreground">
        No account yet? <Link href="/signup" className="text-foreground underline underline-offset-4">Create one</Link>
      </p>
    </form>
  );
}
