"use client";

import { useActionState } from "react";
import { FormError, FormGrid, MoneyField, SelectField, SubmitButton, TextField, useFieldValues, type FormDefaults } from "@/components/forms/fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BILLING_INTERVAL_LABELS, options } from "@/lib/labels";
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
  const [state, action] = useActionState(updateSettingsAction, undefined);
  const f = useFieldValues(state, defaults);
  const currency = f.value("currency") || "EUR";
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormError state={state} />
      {!canEdit && <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">Only owners and admins can change settings.</p>}
      <fieldset disabled={!canEdit} className="space-y-6">
        <Section title="Company" description="How your workspace is named and how money and dates are shown.">
          <FormGrid>
            <TextField name="name" label="Company name" required defaultValue={f.value("name")} errors={f.errors("name")} />
            <TextField name="logoUrl" label="Logo URL" placeholder="https://…/logo.png" hint="A public https image URL. Shown in the sidebar." defaultValue={f.value("logoUrl")} errors={f.errors("logoUrl")} />
            <SelectField name="currency" label="Currency" options={CURRENCIES.map((c) => ({ value: c, label: c }))} defaultValue={f.value("currency")} errors={f.errors("currency")} />
            <SelectField name="timezone" label="Timezone" hint="Decides what “today” is for renewals and run-rate figures." options={timezones.map((t) => ({ value: t, label: t.replaceAll("_", " ") }))} defaultValue={f.value("timezone")} errors={f.errors("timezone")} />
          </FormGrid>
        </Section>
        <Section title="Financial" description="Used by every profit calculation.">
          <FormGrid>
            <MoneyField name="defaultHourlyCost" label="Default internal hourly cost" hint="Your cost price per hour, not the sales rate. Pre-fills new time entries; existing entries keep their own rate." currency={currency} required defaultValue={f.value("defaultHourlyCost")} errors={f.errors("defaultHourlyCost")} />
            <TextField name="labourWindowMonths" label="Labour averaging window (months)" type="number" hint="Monthly labour = labour cost in this many trailing months ÷ months (1–12)." defaultValue={f.value("labourWindowMonths")} errors={f.errors("labourWindowMonths")} />
            <TextField name="lowMarginThreshold" label="Low margin threshold (%)" hint="Margins below this are marked “Low margin”." defaultValue={f.value("lowMarginThreshold")} errors={f.errors("lowMarginThreshold")} />
            <TextField name="negativeMarginThreshold" label="Negative margin threshold (%)" hint="Margins below this are marked “Negative margin”. Usually 0." defaultValue={f.value("negativeMarginThreshold")} errors={f.errors("negativeMarginThreshold")} />
          </FormGrid>
        </Section>
        <Section title="Billing" description="Defaults for new services, hosting and costs.">
          <FormGrid>
            <SelectField name="defaultBillingInterval" label="Default billing interval" options={options(BILLING_INTERVAL_LABELS)} defaultValue={f.value("defaultBillingInterval")} errors={f.errors("defaultBillingInterval")} />
          </FormGrid>
        </Section>
        {canEdit && (
          <div className="flex items-center gap-3">
            <SubmitButton>Save settings</SubmitButton>
            {state?.saved && <span role="status" className="text-xs text-muted-foreground">Saved</span>}
          </div>
        )}
      </fieldset>
    </form>
  );
}
