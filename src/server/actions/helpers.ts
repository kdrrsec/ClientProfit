import "server-only";
import type { Route } from "next";
import { z } from "zod";
import { en } from "@/i18n/messages/en";
import { isMessage, msg } from "@/i18n/translate";
import type { FormState } from "@/lib/validation/auth";
import { NotFoundError } from "@/server/errors";

const SECRET_FIELDS = new Set(["password"]);

/** Submitted non-secret values, echoed back so a form keeps its input after an error. */
export function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData) {
    if (typeof v === "string" && !SECRET_FIELDS.has(k) && !k.startsWith("$")) values[k] = v;
  }
  return values;
}

/**
 * Field errors are message keys (see msg()), translated by the form when it
 * renders. Zod's built-in English messages are replaced by generic keys.
 */
function issueMessage(issue: z.core.$ZodIssue): string {
  if (isMessage(en, issue.message)) return issue.message;
  if (issue.code === "too_big" && issue.origin === "string") return msg("err.tooLong", { max: Number(issue.maximum) });
  if (issue.code === "too_small" && issue.origin === "string") {
    return Number(issue.minimum) <= 1 ? msg("err.required") : msg("err.tooShort", { min: Number(issue.minimum) });
  }
  if (issue.code === "invalid_format" && issue.format === "email") return msg("err.email");
  return msg("err.invalid");
}

export function invalid(error: z.ZodError, formData: FormData): FormState {
  return { fieldErrors: z.flattenError(error, issueMessage).fieldErrors, values: echo(formData) };
}

export function failure(message: string, formData: FormData, fieldErrors?: Record<string, string[]>): FormState {
  return { error: message, fieldErrors, values: echo(formData) };
}

/** Org-wide sections a record form may return to. */
const SECTION_PATHS = ["/domains", "/hosting", "/costs", "/time"];

/**
 * Only same-client paths and the org-wide record sections are allowed as
 * redirect targets, so a tampered hidden field can never become an open redirect.
 */
export function safeReturnTo(value: FormDataEntryValue | null, clientId: string): Route {
  const fallback = `/clients/${clientId}` as Route;
  if (typeof value !== "string") return fallback;
  const bases = [`/clients/${clientId}`, ...SECTION_PATHS];
  const ok =
    bases.some((base) => value === base || value.startsWith(`${base}/`) || value.startsWith(`${base}?`)) &&
    /^[A-Za-z0-9\-_/?=&.%]+$/.test(value) &&
    !value.includes("//") &&
    !value.includes("..");
  return ok ? (value as Route) : fallback;
}

export function requireId(formData: FormData, key: string): string {
  const parsed = z.string().min(1).max(64).safeParse(formData.get(key));
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}

export function optionalId(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null;
}

/** Runs a mutation and turns "not in your organization" into a form error instead of a crash. */
export async function guarded(formData: FormData, fn: () => Promise<void>): Promise<FormState | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof NotFoundError) return failure(e.message, formData);
    throw e;
  }
}
