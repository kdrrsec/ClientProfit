"use client";

import { DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { useI18n } from "@/i18n/client";
import { BILLING_INTERVALS, COST_CATEGORIES, enumOptions } from "@/lib/labels";
import { saveCostAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

export function CostForm(props: RecordFormProps) {
  const { t } = useI18n();
  return (
    <RecordForm action={saveCostAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="name" label={t("field.name")} required placeholder={t("placeholder.costName")} defaultValue={f.value("name")} errors={f.errors("name")} />
            <SelectField name="category" label={t("field.category")} options={enumOptions(t, "costCategory", COST_CATEGORIES)} defaultValue={f.value("category")} errors={f.errors("category")} />
            <MoneyField name="amount" label={t("field.amount")} hint={t("field.perInterval")} currency={props.currency} required defaultValue={f.value("amount")} errors={f.errors("amount")} />
            <SelectField name="billingInterval" label={t("field.billingInterval")} options={enumOptions(t, "interval", BILLING_INTERVALS)} defaultValue={f.value("billingInterval")} errors={f.errors("billingInterval")} />
            <DateField name="startDate" label={t("field.start")} required defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
            <DateField name="endDate" label={t("field.end")} hint={t("field.endHint")} defaultValue={f.value("endDate")} errors={f.errors("endDate")} />
            <DateField name="renewalDate" label={t("field.renewalDate")} defaultValue={f.value("renewalDate")} errors={f.errors("renewalDate")} />
          </FormGrid>
          <TextareaField name="notes" label={t("field.recordNotes")} defaultValue={f.value("notes")} errors={f.errors("notes")} rows={2} />
        </>
      )}
    </RecordForm>
  );
}
