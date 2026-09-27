"use client";

import { CheckboxField, DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { useI18n } from "@/i18n/client";
import { BILLING_INTERVALS, enumOptions, SERVICE_TYPES } from "@/lib/labels";
import { saveServiceAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";


export function ServiceForm(props: RecordFormProps) {
  const { t } = useI18n();
  const intervals = enumOptions(t, "interval", BILLING_INTERVALS);
  return (
    <RecordForm action={saveServiceAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="name" label={t("field.name")} required defaultValue={f.value("name")} errors={f.errors("name")} placeholder="Website" />
            <SelectField name="type" label={t("field.type")} options={enumOptions(t, "serviceType", SERVICE_TYPES)} defaultValue={f.value("type")} errors={f.errors("type")} />
            <SelectField name="billingInterval" label={t("field.billingInterval")} options={intervals} defaultValue={f.value("billingInterval")} errors={f.errors("billingInterval")} />
            <MoneyField name="sellingPrice" label={t("field.sellingPrice")} hint={t("field.sellingPriceHint")} currency={props.currency} required defaultValue={f.value("sellingPrice")} errors={f.errors("sellingPrice")} />
            <TextField name="supplier" label={t("field.supplier")} defaultValue={f.value("supplier")} errors={f.errors("supplier")} />
            <MoneyField name="supplierCost" label={t("field.supplierCost")} hint={t("field.supplierCostHint")} currency={props.currency} defaultValue={f.value("supplierCost")} errors={f.errors("supplierCost")} />
            <SelectField name="costInterval" label={t("field.costInterval")} options={[{ value: "SAME", label: t("field.costIntervalSame") }, ...intervals]} defaultValue={f.value("costInterval")} errors={f.errors("costInterval")} />
            <div className="hidden sm:block" />
            <DateField name="startDate" label={t("field.start")} required defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
            <DateField name="endDate" label={t("field.end")} hint={t("field.endHint")} defaultValue={f.value("endDate")} errors={f.errors("endDate")} />
          </FormGrid>
          <TextareaField name="description" label={t("field.description")} defaultValue={f.value("description")} errors={f.errors("description")} rows={2} />
          <CheckboxField name="isActive" label={t("field.active")} hint={t("field.activeHint")} defaultChecked={f.checked("isActive")} />
        </>
      )}
    </RecordForm>
  );
}
