"use client";

import { CheckboxField, DateField, FormGrid, MoneyField, SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { useI18n } from "@/i18n/client";
import { DOMAIN_STATUSES, enumOptions } from "@/lib/labels";
import { saveDomainAction } from "@/server/actions/records";
import { RecordForm, type RecordFormProps } from "./record-form";

export function DomainForm(props: RecordFormProps) {
  const { t } = useI18n();
  return (
    <RecordForm action={saveDomainAction} props={props}>
      {(f) => (
        <>
          <FormGrid>
            <TextField name="domain" label={t("field.domain")} required placeholder="example.nl" defaultValue={f.value("domain")} errors={f.errors("domain")} />
            <TextField name="registrar" label={t("field.registrar")} defaultValue={f.value("registrar")} errors={f.errors("registrar")} />
            <MoneyField name="sellingPrice" label={t("field.sellingPricePerYear")} currency={props.currency} required defaultValue={f.value("sellingPrice")} errors={f.errors("sellingPrice")} />
            <MoneyField name="renewalCost" label={t("field.renewalCostPerYear")} currency={props.currency} required defaultValue={f.value("renewalCost")} errors={f.errors("renewalCost")} />
            <MoneyField name="purchaseCost" label={t("field.purchaseCostFirstYear")} hint={t("field.purchaseCostFirstYearHint")} currency={props.currency} defaultValue={f.value("purchaseCost")} errors={f.errors("purchaseCost")} />
            <SelectField name="status" label={t("field.status")} options={enumOptions(t, "domainStatus", DOMAIN_STATUSES)} defaultValue={f.value("status")} errors={f.errors("status")} />
            <DateField name="registeredAt" label={t("field.registeredAt")} required defaultValue={f.value("registeredAt")} errors={f.errors("registeredAt")} />
            <DateField name="renewalDate" label={t("field.nextRenewalDate")} required defaultValue={f.value("renewalDate")} errors={f.errors("renewalDate")} />
            <DateField name="cancelledAt" label={t("field.cancelledAt")} hint={t("field.cancelledAtHint")} defaultValue={f.value("cancelledAt")} errors={f.errors("cancelledAt")} />
          </FormGrid>
          <CheckboxField name="autoRenew" label={t("field.autoRenew")} defaultChecked={f.checked("autoRenew")} />
          <TextareaField name="notes" label={t("field.recordNotes")} defaultValue={f.value("notes")} errors={f.errors("notes")} rows={2} />
        </>
      )}
    </RecordForm>
  );
}
