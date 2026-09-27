"use client";

import { useActionState } from "react";
import { FormError, FormGrid, MoneyField, SelectField, SubmitButton, TextField, useFieldValues, type FormDefaults } from "@/components/forms/fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BILLING_INTERVALS, enumOptions } from "@/lib/labels";
import { useI18n } from "@/i18n/client";
import { CURRENCIES } from "@/lib/validation/settings";
import { updateSettingsAction } from "@/server/actions/settings";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function SettingsForm({ defaults, timezones, canEdit }: { defaults: FormDefaults; timezones: string[]; canEdit: boolean }) {
  const { t } = useI18n();
  const [state, action] = useActionState(updateSettingsAction, undefined);
  const f = useFieldValues(state, defaults);
  const currency = f.value("currency") || "EUR";
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormError state={state} />
      {!canEdit && <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">{t("settings.readOnly")}</p>}
      <fieldset disabled={!canEdit} className="space-y-6">
        <Section title={t("settings.company")} description={t("settings.companyDesc")}>
          <FormGrid>
            <TextField name="name" label={t("field.companyName")} required defaultValue={f.value("name")} errors={f.errors("name")} />
            <TextField name="logoUrl" label={t("settings.logoUrl")} placeholder="https://…/logo.png" hint={t("settings.logoUrlHint")} defaultValue={f.value("logoUrl")} errors={f.errors("logoUrl")} />
            <SelectField name="currency" label={t("settings.currency")} options={CURRENCIES.map((c) => ({ value: c, label: c }))} defaultValue={f.value("currency")} errors={f.errors("currency")} />
            <SelectField name="timezone" label={t("settings.timezone")} hint={t("settings.timezoneHint")} options={timezones.map((tz) => ({ value: tz, label: tz.replaceAll("_", " ") }))} defaultValue={f.value("timezone")} errors={f.errors("timezone")} />
          </FormGrid>
        </Section>
        <Section title={t("settings.financial")} description={t("settings.financialDesc")}>
          <FormGrid>
            <MoneyField name="defaultHourlyCost" label={t("settings.hourlyCost")} hint={t("settings.hourlyCostHint")} currency={currency} required defaultValue={f.value("defaultHourlyCost")} errors={f.errors("defaultHourlyCost")} />
            <TextField name="labourWindowMonths" label={t("settings.labourWindow")} type="number" hint={t("settings.labourWindowHint")} defaultValue={f.value("labourWindowMonths")} errors={f.errors("labourWindowMonths")} />
            <TextField name="lowMarginThreshold" label={t("settings.lowMargin")} hint={t("settings.lowMarginHint")} defaultValue={f.value("lowMarginThreshold")} errors={f.errors("lowMarginThreshold")} />
            <TextField name="negativeMarginThreshold" label={t("settings.negativeMargin")} hint={t("settings.negativeMarginHint")} defaultValue={f.value("negativeMarginThreshold")} errors={f.errors("negativeMarginThreshold")} />
          </FormGrid>
        </Section>
        <Section title={t("settings.billing")} description={t("settings.billingDesc")}>
          <FormGrid>
            <SelectField name="defaultBillingInterval" label={t("settings.defaultInterval")} options={enumOptions(t, "interval", BILLING_INTERVALS)} defaultValue={f.value("defaultBillingInterval")} errors={f.errors("defaultBillingInterval")} />
          </FormGrid>
        </Section>
        {canEdit && (
          <div className="flex items-center gap-3">
            <SubmitButton>{t("settings.save")}</SubmitButton>
            {state?.saved && <span role="status" className="text-xs text-muted-foreground">{t("common.saved")}</span>}
          </div>
        )}
      </fieldset>
    </form>
  );
}
