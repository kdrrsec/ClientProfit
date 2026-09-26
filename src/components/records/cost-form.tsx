"use client";

import { DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { BILLING_INTERVAL_LABELS, COST_CATEGORY_LABELS, options } from "@/lib/labels";
import { saveCostAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

export function CostForm(props: RecordFormProps) {
  return (
    <RecordForm action={saveCostAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="name" label="Name" required placeholder="Adobe subscription" defaultValue={f.value("name")} errors={f.errors("name")} />
            <SelectField name="category" label="Category" options={options(COST_CATEGORY_LABELS)} defaultValue={f.value("category")} errors={f.errors("category")} />
            <MoneyField name="amount" label="Amount" hint="Per billing interval" currency={props.currency} required defaultValue={f.value("amount")} errors={f.errors("amount")} />
            <SelectField name="billingInterval" label="Billing interval" options={options(BILLING_INTERVAL_LABELS)} defaultValue={f.value("billingInterval")} errors={f.errors("billingInterval")} />
            <DateField name="startDate" label="Start date" required defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
            <DateField name="endDate" label="End date" hint="Leave empty if ongoing" defaultValue={f.value("endDate")} errors={f.errors("endDate")} />
            <DateField name="renewalDate" label="Renewal date" defaultValue={f.value("renewalDate")} errors={f.errors("renewalDate")} />
          </FormGrid>
          <TextareaField name="notes" label="Notes" defaultValue={f.value("notes")} errors={f.errors("notes")} rows={2} />
        </>
      )}
    </RecordForm>
  );
}
