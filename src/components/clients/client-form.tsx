"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import {
  DateField,
  FormError,
  FormGrid,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
  useFieldValues,
  type FormDefaults,
} from "@/components/forms/fields";
import { buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { CLIENT_STATUSES, enumOptions } from "@/lib/labels";
import { createClientAction, updateClientAction } from "@/server/actions/clients";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ClientForm({ clientId, defaults, cancelHref }: { clientId?: string; defaults: FormDefaults; cancelHref: Route }) {
  const { t } = useI18n();
  const [state, action] = useActionState(clientId ? updateClientAction : createClientAction, undefined);
  const f = useFieldValues(state, defaults);
  return (
    <form action={action} className="grid gap-8" noValidate>
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <FormError state={state} />
      <Section title={t("clientForm.company")}>
        <FormGrid>
          <TextField name="companyName" label={t("field.companyName")} required autoComplete="organization" defaultValue={f.value("companyName")} errors={f.errors("companyName")} />
          <SelectField name="status" label={t("field.status")} options={enumOptions(t, "clientStatus", CLIENT_STATUSES)} defaultValue={f.value("status")} errors={f.errors("status")} />
          <TextField name="website" label={t("field.website")} placeholder="example.nl" defaultValue={f.value("website")} errors={f.errors("website")} />
          <div className="hidden sm:block" />
          <TextField name="vatNumber" label={t("field.vatNumber")} defaultValue={f.value("vatNumber")} errors={f.errors("vatNumber")} />
          <TextField name="chamberOfCommerce" label={t("field.kvk")} defaultValue={f.value("chamberOfCommerce")} errors={f.errors("chamberOfCommerce")} />
        </FormGrid>
      </Section>
      <Section title={t("clientForm.contact")}>
        <FormGrid>
          <TextField name="contactName" label={t("field.contactName")} defaultValue={f.value("contactName")} errors={f.errors("contactName")} />
          <TextField name="email" label={t("field.email")} type="email" defaultValue={f.value("email")} errors={f.errors("email")} />
          <TextField name="phone" label={t("field.phone")} type="tel" defaultValue={f.value("phone")} errors={f.errors("phone")} />
        </FormGrid>
      </Section>
      <Section title={t("clientForm.address")}>
        <FormGrid>
          <TextField name="addressLine1" label={t("field.address")} defaultValue={f.value("addressLine1")} errors={f.errors("addressLine1")} />
          <TextField name="addressLine2" label={t("field.addressLine2")} defaultValue={f.value("addressLine2")} errors={f.errors("addressLine2")} />
          <TextField name="postalCode" label={t("field.postalCode")} defaultValue={f.value("postalCode")} errors={f.errors("postalCode")} />
          <TextField name="city" label={t("field.city")} defaultValue={f.value("city")} errors={f.errors("city")} />
          <TextField name="country" label={t("field.country")} placeholder="NL" defaultValue={f.value("country")} errors={f.errors("country")} />
        </FormGrid>
      </Section>
      <Section title={t("clientForm.contract")}>
        <FormGrid>
          <DateField name="startDate" label={t("field.startDate")} hint={t("field.startDateHint")} defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
          <DateField name="contractRenewalDate" label={t("field.contractRenewalDate")} defaultValue={f.value("contractRenewalDate")} errors={f.errors("contractRenewalDate")} />
        </FormGrid>
        <TextareaField name="notes" label={t("field.notes")} defaultValue={f.value("notes")} errors={f.errors("notes")} />
      </Section>
      <div className="flex items-center gap-2">
        <SubmitButton>{clientId ? t("common.saveChanges") : t("clientForm.create")}</SubmitButton>
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
