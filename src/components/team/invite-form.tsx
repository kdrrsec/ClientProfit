"use client";

import { useActionState, useState } from "react";
import { FormError, FormGrid, SelectField, SubmitButton, TextField, useFieldValues } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import { inviteMemberAction } from "@/server/actions/team";

export function InviteForm({ ttlDays }: { ttlDays: number }) {
  const { t } = useI18n();
  const [state, action] = useActionState(inviteMemberAction, undefined);
  const roles = [
    { value: "MEMBER", label: t("invite.roleMember") },
    { value: "ADMIN", label: t("invite.roleAdmin") },
  ];
  const f = useFieldValues(state, { role: "MEMBER" });
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4" noValidate>
        <FormError state={state} />
        <FormGrid>
          <TextField name="email" label={t("field.email")} type="email" required defaultValue={f.value("email")} errors={f.errors("email")} placeholder={t("invite.placeholder")} />
          <SelectField name="role" label={t("col.role")} options={roles} defaultValue={f.value("role")} errors={f.errors("role")} />
        </FormGrid>
        <div>
          <SubmitButton pendingLabel={t("common.creating")}>{t("invite.create")}</SubmitButton>
        </div>
      </form>
      {state?.inviteUrl && (
        <div className="space-y-2 rounded-md border bg-muted/50 p-3" role="status">
          <p className="text-sm font-medium">{t("invite.created")}</p>
          <p className="text-xs text-muted-foreground">{t("invite.createdHelp", { days: ttlDays })}</p>
          <div className="flex gap-2">
            <Input readOnly value={state.inviteUrl} aria-label={t("invite.link")} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(state.inviteUrl!);
                setCopied(true);
              }}
            >
              {copied ? t("invite.copied") : t("invite.copy")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
