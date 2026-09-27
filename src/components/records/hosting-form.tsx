"use client";

import { DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { useI18n } from "@/i18n/client";
import { BILLING_INTERVALS, enumOptions } from "@/lib/labels";
import { saveHostingAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";


export function HostingForm(props: RecordFormProps) {
  const { t } = useI18n();
  const intervals = enumOptions(t, "interval", BILLING_INTERVALS).filter((o) => o.value !== "ONE_TIME");
  return (
    <RecordForm action={saveHostingAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="product" label={t("field.hostingProduct")} required placeholder={t("placeholder.hostingProduct")} defaultValue={f.value("product")} errors={f.errors("product")} />
            <TextField name="provider" label={t("field.provider")} defaultValue={f.value("provider")} errors={f.errors("provider")} />
            <SelectField name="billingInterval" label={t("field.billingInterval")} options={intervals} defaultValue={f.value("billingInterval")} errors={f.errors("billingInterval")} />
            <TextField name="server" label={t("field.server")} defaultValue={f.value("server")} errors={f.errors("server")} />
            <MoneyField name="sellingPrice" label={t("field.sellingPrice")} hint={t("field.perInterval")} currency={props.currency} required defaultValue={f.value("sellingPrice")} errors={f.errors("sellingPrice")} />
            <MoneyField name="purchaseCost" label={t("field.purchaseCost")} hint={t("field.perInterval")} currency={props.currency} required defaultValue={f.value("purchaseCost")} errors={f.errors("purchaseCost")} />
            <DateField name="startDate" label={t("field.start")} required defaultValue={f.value("startDate")} errors={f.errors("startDate")} />
            <DateField name="renewalDate" label={t("field.renewalDate")} defaultValue={f.value("renewalDate")} errors={f.errors("renewalDate")} />
            <DateField name="endDate" label={t("field.end")} hint={t("field.endHint")} defaultValue={f.value("endDate")} errors={f.errors("endDate")} />
          </FormGrid>
          <TextareaField name="notes" label={t("field.recordNotes")} defaultValue={f.value("notes")} errors={f.errors("notes")} rows={2} />
        </>
      )}
    </RecordForm>
  );
}
