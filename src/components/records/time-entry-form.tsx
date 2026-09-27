"use client";

import { DateField, FormGrid, MoneyField, TextField } from "@/components/forms/fields";
import { useI18n } from "@/i18n/client";
import { saveTimeEntryAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

export function TimeEntryForm(props: RecordFormProps) {
  const { t } = useI18n();
  return (
    <RecordForm action={saveTimeEntryAction} props={props}>
      {(f) => (
        <FormGrid className="sm:grid-cols-4">
          <DateField name="date" label={t("field.date")} required defaultValue={f.value("date")} errors={f.errors("date")} />
          <TextField name="hours" label={t("field.hours")} required placeholder="1,5" defaultValue={f.value("hours")} errors={f.errors("hours")} />
          <MoneyField name="hourlyCost" label={t("field.internalHourlyCost")} hint={t("field.internalHourlyCostHint")} currency={props.currency} required defaultValue={f.value("hourlyCost")} errors={f.errors("hourlyCost")} className="sm:col-span-2" />
          <TextField name="description" label={t("field.description")} required placeholder={t("placeholder.timeDescription")} defaultValue={f.value("description")} errors={f.errors("description")} className="sm:col-span-4" />
        </FormGrid>
      )}
    </RecordForm>
  );
}
