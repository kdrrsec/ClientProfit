"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { createOrganizationAction } from "@/server/actions/auth";
import { FormField } from "./form-field";

export function OrganizationForm() {
  const { t, tm } = useI18n();
  const [state, action, pending] = useActionState(createOrganizationAction, undefined);
  return (
    <form action={action} className="grid gap-4">
      <FormField name="companyName" label={t("auth.companyName")} autoComplete="organization" errors={state?.fieldErrors?.companyName} defaultValue={state?.values?.companyName} />
      {state?.error && <p role="alert" className="text-sm text-critical">{tm(state.error)}</p>}
      <Button type="submit" disabled={pending}>{pending ? t("common.creating") : t("common.continue")}</Button>
    </form>
  );
}
