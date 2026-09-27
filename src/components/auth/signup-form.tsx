"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/client";
import { signUpAction } from "@/server/actions/auth";
import { FormField } from "./form-field";

/** Without an invite a new company is created; with one, the account joins the inviting organization. */
export function SignupForm({ invite }: { invite?: { token: string; email: string } }) {
  const { t, tm } = useI18n();
  const [state, action, pending] = useActionState(signUpAction, undefined);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4">
      <FormField name="name" label={t("auth.yourName")} autoComplete="name" errors={e?.name} defaultValue={state?.values?.name} />
      {invite ? (
        <>
          <input type="hidden" name="invite" value={invite.token} />
          <div className="grid gap-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" name="email" type="email" value={invite.email} readOnly className="bg-muted" />
          </div>
        </>
      ) : (
        <>
          <FormField name="companyName" label={t("auth.companyName")} autoComplete="organization" errors={e?.companyName} defaultValue={state?.values?.companyName} />
          <FormField name="email" label={t("auth.email")} type="email" autoComplete="email" errors={e?.email} defaultValue={state?.values?.email} />
        </>
      )}
      <FormField name="password" label={t("auth.password")} type="password" autoComplete="new-password" errors={e?.password} />
      {state?.error && <p role="alert" className="text-sm text-critical">{tm(state.error)}</p>}
      <Button type="submit" disabled={pending}>{pending ? t("auth.creatingAccount") : invite ? t("auth.createAccountAndJoin") : t("auth.createAccount")}</Button>
      <p className="text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href={invite ? (`/login?invite=${invite.token}` as Route) : "/login"} className="text-foreground underline underline-offset-4">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}
