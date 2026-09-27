"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { signInAction } from "@/server/actions/auth";
import { FormField } from "./form-field";

export function LoginForm({ invite }: { invite?: string }) {
  const { t, tm } = useI18n();
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form action={action} className="grid gap-4">
      {invite && <input type="hidden" name="invite" value={invite} />}
      <FormField name="email" label={t("auth.email")} type="email" autoComplete="email" errors={state?.fieldErrors?.email} defaultValue={state?.values?.email} />
      <FormField name="password" label={t("auth.password")} type="password" autoComplete="current-password" errors={state?.fieldErrors?.password} />
      {state?.error && <p role="alert" className="text-sm text-critical">{tm(state.error)}</p>}
      <Button type="submit" disabled={pending}>{pending ? t("auth.signingIn") : t("auth.signIn")}</Button>
      <p className="text-sm text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link href={invite ? (`/signup?invite=${invite}` as Route) : "/signup"} className="text-foreground underline underline-offset-4">
          {t("auth.createOne")}
        </Link>
      </p>
    </form>
  );
}
