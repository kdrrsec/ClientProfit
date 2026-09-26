"use client";

import { CheckboxField, DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { DOMAIN_STATUS_LABELS, options } from "@/lib/labels";
import { saveDomainAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

export function DomainForm(props: RecordFormProps) {
  return (
    <RecordForm action={saveDomainAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="domain" label="Domain" required placeholder="example.nl" defaultValue={f.value("domain")} errors={f.errors("domain")} />
            <TextField name="registrar" label="Registrar" defaultValue={f.value("registrar")} errors={f.errors("registrar")} />
            <MoneyField name="sellingPrice" label="Selling price / year" currency={props.currency} required defaultValue={f.value("sellingPrice")} errors={f.errors("sellingPrice")} />
            <MoneyField name="renewalCost" label="Renewal cost / year" currency={props.currency} required defaultValue={f.value("renewalCost")} errors={f.errors("renewalCost")} />
            <MoneyField name="purchaseCost" label="Purchase cost (first year)" hint="0 if the renewal cost also applied in year one" currency={props.currency} defaultValue={f.value("purchaseCost")} errors={f.errors("purchaseCost")} />
            <SelectField name="status" label="Status" options={options(DOMAIN_STATUS_LABELS)} defaultValue={f.value("status")} errors={f.errors("status")} />
            <DateField name="registeredAt" label="Registration date" required defaultValue={f.value("registeredAt")} errors={f.errors("registeredAt")} />
            <DateField name="renewalDate" label="Next renewal date" required defaultValue={f.value("renewalDate")} errors={f.errors("renewalDate")} />
            <DateField name="cancelledAt" label="Cancelled / expired on" hint="Only for cancelled or expired domains" defaultValue={f.value("cancelledAt")} errors={f.errors("cancelledAt")} />
          </FormGrid>
          <CheckboxField name="autoRenew" label="Auto-renew" defaultChecked={f.checked("autoRenew")} />
          <TextareaField name="notes" label="Notes" defaultValue={f.value("notes")} errors={f.errors("notes")} rows={2} />
        </>
      )}
    </RecordForm>
  );
}
