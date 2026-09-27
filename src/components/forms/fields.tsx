"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import type { FormState } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

export type FormDefaults = Record<string, string>;

/** Value to show: what the user just submitted (after an error), else the record's value. */
export function useFieldValues(state: FormState, defaults: FormDefaults) {
  return {
    value: (name: string) => state?.values?.[name] ?? defaults[name] ?? "",
    checked: (name: string) => (state?.values ? state.values[name] === "on" : defaults[name] === "on"),
    errors: (name: string) => state?.fieldErrors?.[name],
  };
}

interface BaseProps {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
  className?: string;
}

function FieldShell({ name, label, hint, errors, className, children }: BaseProps & { children: React.ReactNode }) {
  const { tm } = useI18n();
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {errors ? (
        <p id={`${name}-error`} className="text-xs text-critical">
          {tm(errors[0] ?? "")}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

const a11y = (name: string, errors?: string[]) => ({
  "aria-invalid": errors ? true : undefined,
  "aria-describedby": errors ? `${name}-error` : undefined,
});

export function TextField(
  props: BaseProps & { defaultValue: string; type?: string; required?: boolean; placeholder?: string; autoComplete?: string },
) {
  const { name, errors, defaultValue, type = "text", required, placeholder, autoComplete } = props;
  return (
    <FieldShell {...props}>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} autoComplete={autoComplete} {...a11y(name, errors)} />
    </FieldShell>
  );
}

/** Text input for exact decimal amounts (validated server-side; never parsed as float). */
export function MoneyField(props: BaseProps & { defaultValue: string; currency: string; required?: boolean }) {
  const { name, errors, defaultValue, currency, required } = props;
  return (
    <FieldShell {...props}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
          {currency === "EUR" ? "€" : currency}
        </span>
        <Input id={name} name={name} inputMode="decimal" defaultValue={defaultValue} required={required} placeholder="0,00" className="pl-8 tabular-nums" {...a11y(name, errors)} />
      </div>
    </FieldShell>
  );
}

export function DateField(props: BaseProps & { defaultValue: string; required?: boolean }) {
  const { name, errors, defaultValue, required } = props;
  return (
    <FieldShell {...props}>
      <Input id={name} name={name} type="date" defaultValue={defaultValue} required={required} {...a11y(name, errors)} />
    </FieldShell>
  );
}

export function SelectField(props: BaseProps & { defaultValue: string; options: { value: string; label: string }[] }) {
  const { name, errors, defaultValue, options } = props;
  return (
    <FieldShell {...props}>
      <Select id={name} name={name} defaultValue={defaultValue} {...a11y(name, errors)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </FieldShell>
  );
}

export function TextareaField(props: BaseProps & { defaultValue: string; rows?: number }) {
  const { name, errors, defaultValue, rows = 3 } = props;
  return (
    <FieldShell {...props}>
      <Textarea id={name} name={name} defaultValue={defaultValue} rows={rows} {...a11y(name, errors)} />
    </FieldShell>
  );
}

export function CheckboxField({ name, label, hint, defaultChecked, className }: { name: string; label: string; hint?: string; defaultChecked: boolean; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input id={name} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-0.5 size-4 rounded border-input accent-primary" />
      <div>
        <Label htmlFor={name}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function FormError({ state }: { state: FormState }) {
  const { tm } = useI18n();
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-sm text-critical">
      {tm(state.error)}
    </p>
  );
}

export function SubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (pendingLabel ?? t("common.saving")) : children}
    </Button>
  );
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}
