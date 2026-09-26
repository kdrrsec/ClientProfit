"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/forms/fields";
import { Textarea } from "@/components/ui/textarea";
import { updateNotesAction } from "@/server/actions/clients";

export function NotesForm({ clientId, notes }: { clientId: string; notes: string }) {
  const [state, action] = useActionState(updateNotesAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="clientId" value={clientId} />
      <FormError state={state} />
      <Textarea name="notes" aria-label="Internal notes" defaultValue={state?.values?.notes ?? notes} rows={10} />
      {state?.fieldErrors?.notes && <p className="text-xs text-critical">{state.fieldErrors.notes[0]}</p>}
      <div className="flex items-center gap-3">
        <SubmitButton>Save notes</SubmitButton>
        {state?.saved && <span role="status" className="text-xs text-muted-foreground">Saved</span>}
      </div>
    </form>
  );
}
