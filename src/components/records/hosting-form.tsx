"use client";

import { DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { BILLING_INTERVAL_LABELS, options } from "@/lib/labels";
import { saveHostingAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

const INTERVALS = options(BILLING_INTERVAL_LABELS).filter((o) => o.value !== "ONE_TIME");

export function HostingForm(props: RecordFormProps) {
  return (
    <RecordForm action={saveHostingAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="product" label="Hosting product" required placeholder="Managed WordPress" defaultValue={f.value("product")} errors={f.errors("product")} />
            <TextField name="provider" label="Provider" defaultValue={f.value("provider")} errors={f.errors("provider")} />
            <SelectField name="billingInterval" label="Billing interval" options={INTERVALS} defaultValue={f.value("billingInterval")} errors={f.errors("billingInterval")} />
            <TextField name="server" label="Server" defaultValue={f.value("server")} errors={f.errors("server")} />
            <MoneyField name="sellingPrice" label="Selling price" hint="Per billing interval" currency={props.currency} required defaultValue={f.value("sellingPrice")} errors={f.errors("sellingPrice")} />
            <MoneyField name="purchaseCost" label="Purchase cost" hint="Per billing interval" currency={props.currency} required defaultValue={f.value("purchaseCost")} errors={f.errors("purchaseCost")} />
            <DateField name="startDate" label="Start date" required defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
            <DateField name="renewalDate" label="Renewal date" defaultValue={f.value("renewalDate")} errors={f.errors("renewalDate")} />
            <DateField name="endDate" label="End date" hint="Leave empty if ongoing" defaultValue={f.value("endDate")} errors={f.errors("endDate")} />
          </FormGrid>
          <TextareaField name="notes" label="Notes" defaultValue={f.value("notes")} errors={f.errors("notes")} rows={2} />
        </>
      )}
    </RecordForm>
  );
}
