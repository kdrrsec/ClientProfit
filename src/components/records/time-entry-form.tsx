"use client";

import { DateField, FormGrid, MoneyField, TextField } from "@/components/forms/fields";
import { saveTimeEntryAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

export function TimeEntryForm(props: RecordFormProps) {
  return (
    <RecordForm action={saveTimeEntryAction} props={props}>
      {(f) => (
        <FormGrid className="sm:grid-cols-4">
          <DateField name="date" label="Date" required defaultValue={f.value("date")} errors={f.errors("date")} />
          <TextField name="hours" label="Hours" required placeholder="1,5" defaultValue={f.value("hours")} errors={f.errors("hours")} />
          <MoneyField name="hourlyCost" label="Internal hourly cost" hint="Your cost price, not the sales rate" currency={props.currency} required defaultValue={f.value("hourlyCost")} errors={f.errors("hourlyCost")} className="sm:col-span-2" />
          <TextField name="description" label="Description" required placeholder="Website maintenance" defaultValue={f.value("description")} errors={f.errors("description")} className="sm:col-span-4" />
        </FormGrid>
      )}
    </RecordForm>
  );
}
