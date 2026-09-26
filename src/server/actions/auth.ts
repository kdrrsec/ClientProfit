"use server";

import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createOrganizationSchema, signInSchema, signUpSchema, type FormState } from "@/lib/validation/auth";
import { auth } from "@/server/auth/auth";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/server/auth/context";
import { createOrganizationForUser } from "@/server/repositories/organizations";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

const SECRET_FIELDS = new Set(["password"]);

function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !SECRET_FIELDS.has(k) && !k.startsWith("$")) values[k] = v;
  return values;
}

function fieldErrors(error: z.ZodError, formData: FormData): FormState {
  return { fieldErrors: z.flattenError(error).fieldErrors, values: echo(formData) };
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError) return { error: "Invalid email or password", values: echo(formData) };
    throw e;
  }
  redirect("/dashboard");
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const { name, email, password, companyName } = parsed.data;

  let userId: string;
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
    userId = result.user.id;
  } catch (e) {
    if (e instanceof APIError) return { error: e.message || "Could not create account", values: echo(formData) };
    throw e;
  }

  // If this fails the user still exists and is sent to /onboarding to retry.
  const org = await createOrganizationForUser(userId, companyName);
  (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, cookieOptions);
  redirect("/dashboard");
}

export async function createOrganizationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = createOrganizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);

  const org = await createOrganizationForUser(user.id, parsed.data.companyName);
  (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, cookieOptions);
  redirect("/dashboard");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  redirect("/login");
}
