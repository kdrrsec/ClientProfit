"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function Confirm({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" size="sm" disabled={pending}>
      {pending ? "Working…" : label}
    </Button>
  );
}

/**
 * Two-step destructive action: first click reveals the confirmation. Works as
 * a normal form submit, so the server action does all validation.
 */
export function ConfirmButton({
  action,
  fields,
  label,
  confirmLabel,
  message,
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  confirmLabel: string;
  message: string;
  variant?: "outline" | "ghost";
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button type="button" variant={variant} size="sm" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <span className="text-xs text-muted-foreground">{message}</span>
      <Confirm label={confirmLabel} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </form>
  );
}
