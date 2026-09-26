"use client";

import { CheckboxField, DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { BILLING_INTERVAL_LABELS, options, SERVICE_TYPE_LABELS } from "@/lib/labels";
import { saveServiceAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

const COST_INTERVALS = [{ value: "SAME", label: "Same as billing interval" }, ...options(BILLING_INTERVAL_LABELS)];

export function ServiceForm(props: RecordFormProps) {
  return (
    <RecordForm action={saveServiceAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="name" label="Name" required defaultValue={f.value("name")} errors={f.errors("name")} placeholder="Website" />
            <SelectField name="type" label="Type" options={options(SERVICE_TYPE_LABELS)} defaultValue={f.value("type")} errors={f.errors("type")} />
            <SelectField name="billingInterval" label="Billing interval" options={options(BILLING_INTERVAL_LABELS)} defaultValue={f.value("billingInterval")} errors={f.errors("billingInterval")} />
            <MoneyField name="sellingPrice" label="Selling price" hint="What the client pays per billing interval" currency={props.currency} required defaultValue={f.value("sellingPrice")} errors={f.errors("sellingPrice")} />
            <TextField name="supplier" label="Supplier" defaultValue={f.value("supplier")} errors={f.errors("supplier")} />
            <MoneyField name="supplierCost" label="Supplier cost" hint="What you pay for it; 0 if nothing" currency={props.currency} defaultValue={f.value("supplierCost")} errors={f.errors("supplierCost")} />
            <SelectField name="costInterval" label="Supplier cost interval" options={COST_INTERVALS} defaultValue={f.value("costInterval")} errors={f.errors("costInterval")} />
            <div className="hidden sm:block" />
            <DateField name="startDate" label="Start date" required defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
            <DateField name="endDate" label="End date" hint="Leave empty if ongoing" defaultValue={f.value("endDate")} errors={f.errors("endDate")} />
          </FormGrid>
          <TextareaField name="description" label="Description" defaultValue={f.value("description")} errors={f.errors("description")} rows={2} />
          <CheckboxField name="isActive" label="Active" hint="Unchecking without an end date ends the service today." defaultChecked={f.checked("isActive")} />
        </>
      )}
    </RecordForm>
  );
}
