"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import { FormError, SelectField, SubmitButton, useFieldValues, type FormDefaults } from "@/components/forms/fields";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import type { FormState } from "@/lib/validation/auth";

export interface RecordFormProps {
  clientId: string;
  /** Present when editing. */
  recordId?: string;
  defaults: FormDefaults;
  returnTo: string;
  cancelHref?: Route;
  currency: string;
  submitLabel?: string;
  /** When set (org-wide "add" forms), the client is chosen in the form instead of fixed. */
  clientOptions?: { value: string; label: string }[];
}

type Fields = ReturnType<typeof useFieldValues>;

/** Shared shell for every client-record form: hidden ids, error banner, actions. */
export function RecordForm({
  action,
  props,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  props: RecordFormProps;
  children: (f: Fields) => React.ReactNode;
}) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, undefined);
  const fields = useFieldValues(state, props.defaults);
  return (
    <form action={formAction} className="grid gap-5" noValidate>
      {props.clientOptions ? (
        <SelectField
          name="clientId"
          label={t("field.client")}
          options={props.clientOptions}
          defaultValue={fields.value("clientId") || props.clientId}
          errors={fields.errors("clientId")}
          className="sm:max-w-sm"
        />
      ) : (
        <input type="hidden" name="clientId" value={props.clientId} />
      )}
      {props.recordId && <input type="hidden" name="id" value={props.recordId} />}
      <input type="hidden" name="returnTo" value={props.returnTo} />
      <FormError state={state} />
      {children(fields)}
      <div className="flex items-center gap-2">
        <SubmitButton>{props.submitLabel ?? (props.recordId ? t("common.saveChanges") : t("common.add"))}</SubmitButton>
        {props.cancelHref && (
          <Link href={props.cancelHref} className={buttonVariants({ variant: "ghost" })}>
            {t("common.cancel")}
          </Link>
        )}
      </div>
    </form>
  );
}
