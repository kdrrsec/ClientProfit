"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/forms/fields";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import { updateNotesAction } from "@/server/actions/clients";

export function NotesForm({ clientId, notes }: { clientId: string; notes: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(updateNotesAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <FormError state={state} />
      <Textarea name="notes" aria-label={t("notes.title")} defaultValue={state?.values?.notes ?? notes} rows={10} />
      {state?.fieldErrors?.notes && <p className="text-xs text-critical">{state.fieldErrors.notes[0]}</p>}
      <div className="flex items-center gap-3">
        <SubmitButton>{t("notes.save")}</SubmitButton>
        {state?.saved && <span role="status" className="text-xs text-muted-foreground">{t("common.saved")}</span>}
      </div>
    </form>
  );
}
