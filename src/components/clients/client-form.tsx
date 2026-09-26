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
import { CLIENT_STATUS_LABELS, options } from "@/lib/labels";
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
  const [state, action] = useActionState(clientId ? updateClientAction : createClientAction, undefined);
  const f = useFieldValues(state, defaults);
  return (
    <form action={action} className="grid gap-8" noValidate>
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <FormError state={state} />
      <Section title="Company">
        <FormGrid>
          <TextField name="companyName" label="Company name" required autoComplete="organization" defaultValue={f.value("companyName")} errors={f.errors("companyName")} />
          <SelectField name="status" label="Status" options={options(CLIENT_STATUS_LABELS)} defaultValue={f.value("status")} errors={f.errors("status")} />
          <TextField name="website" label="Website" placeholder="example.nl" defaultValue={f.value("website")} errors={f.errors("website")} />
          <div className="hidden sm:block" />
          <TextField name="vatNumber" label="VAT number" defaultValue={f.value("vatNumber")} errors={f.errors("vatNumber")} />
          <TextField name="chamberOfCommerce" label="KVK number" defaultValue={f.value("chamberOfCommerce")} errors={f.errors("chamberOfCommerce")} />
        </FormGrid>
      </Section>
      <Section title="Contact">
        <FormGrid>
          <TextField name="contactName" label="Contact person" defaultValue={f.value("contactName")} errors={f.errors("contactName")} />
          <TextField name="email" label="Email" type="email" defaultValue={f.value("email")} errors={f.errors("email")} />
          <TextField name="phone" label="Phone" type="tel" defaultValue={f.value("phone")} errors={f.errors("phone")} />
        </FormGrid>
      </Section>
      <Section title="Address">
        <FormGrid>
          <TextField name="addressLine1" label="Address" defaultValue={f.value("addressLine1")} errors={f.errors("addressLine1")} />
          <TextField name="addressLine2" label="Address line 2" defaultValue={f.value("addressLine2")} errors={f.errors("addressLine2")} />
          <TextField name="postalCode" label="Postal code" defaultValue={f.value("postalCode")} errors={f.errors("postalCode")} />
          <TextField name="city" label="City" defaultValue={f.value("city")} errors={f.errors("city")} />
          <TextField name="country" label="Country code" placeholder="NL" defaultValue={f.value("country")} errors={f.errors("country")} />
        </FormGrid>
      </Section>
      <Section title="Contract">
        <FormGrid>
          <DateField name="startDate" label="Client since" hint="Used to average labour for new clients" defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
          <DateField name="contractRenewalDate" label="Contract renewal date" defaultValue={f.value("contractRenewalDate")} errors={f.errors("contractRenewalDate")} />
        </FormGrid>
        <TextareaField name="notes" label="Internal notes" defaultValue={f.value("notes")} errors={f.errors("notes")} />
      </Section>
      <div className="flex items-center gap-2">
        <SubmitButton>{clientId ? "Save changes" : "Create client"}</SubmitButton>
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
