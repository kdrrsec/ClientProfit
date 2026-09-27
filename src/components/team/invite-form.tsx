"use client";

import { useActionState, useState } from "react";
import { FormError, FormGrid, SelectField, SubmitButton, TextField, useFieldValues } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMemberAction } from "@/server/actions/team";

const ROLES = [
  { value: "MEMBER", label: "Member — can view and edit client data" },
  { value: "ADMIN", label: "Admin — can also manage settings and team" },
];

export function InviteForm({ ttlDays }: { ttlDays: number }) {
  const [state, action] = useActionState(inviteMemberAction, undefined);
  const f = useFieldValues(state, { role: "MEMBER" });
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-4" noValidate>
        <FormError state={state} />
        <FormGrid>
          <TextField name="email" label="Email" type="email" required defaultValue={f.value("email")} errors={f.errors("email")} placeholder="colleague@company.nl" />
          <SelectField name="role" label="Role" options={ROLES} defaultValue={f.value("role")} errors={f.errors("role")} />
        </FormGrid>
        <div>
          <SubmitButton pendingLabel="Creating…">Create invitation link</SubmitButton>
        </div>
      </form>
      {state?.inviteUrl && (
        <div className="space-y-2 rounded-md border bg-muted/50 p-3" role="status">
          <p className="text-sm font-medium">Invitation link created</p>
          <p className="text-xs text-muted-foreground">
            Send this link to your colleague yourself (no email is sent). It works once, only for that email address, and expires in {ttlDays} days. It is
            shown only now.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={state.inviteUrl} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(state.inviteUrl!);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
