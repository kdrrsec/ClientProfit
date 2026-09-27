"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/client";

export function FormField({
  name,
  label,
  type = "text",
  autoComplete,
  errors,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
  defaultValue?: string;
}) {
  const { tm } = useI18n();
  const errorId = `${name}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        defaultValue={defaultValue}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : undefined}
      />
      {errors && (
        <p id={errorId} className="text-xs text-critical">
          {tm(errors[0] ?? "")}
        </p>
      )}
    </div>
  );
}
