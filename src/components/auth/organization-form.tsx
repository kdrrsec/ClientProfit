"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createOrganizationAction } from "@/server/actions/auth";
import { FormField } from "./form-field";

export function OrganizationForm() {
  const [state, action, pending] = useActionState(createOrganizationAction, undefined);
  return (
    <form action={action} className="grid gap-4">
      <FormField name="companyName" label="Company name" autoComplete="organization" errors={state?.fieldErrors?.companyName} defaultValue={state?.values?.companyName} />
      {state?.error && <p role="alert" className="text-sm text-critical">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Continue"}</Button>
    </form>
  );
}
