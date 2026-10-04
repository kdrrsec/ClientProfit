"use server";

import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createOrganizationSchema, signInSchema, signUpSchema, signUpWithInviteSchema, type FormState } from "@/lib/validation/auth";
import { inviteTokenSchema } from "@/lib/validation/team";
import type { Route } from "next";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { msg } from "@/i18n/translate";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/server/auth/context";
import { createOrganizationForUser } from "@/server/repositories/organizations";
import { acceptInvitation, TeamError } from "@/server/repositories/team";
import { echo, invalid } from "./helpers";

/** Better Auth's messages are English-only; map the one users can act on and keep the rest generic. */
function signUpError(e: APIError): string {
  return e.body?.code === "USER_ALREADY_EXISTS" || e.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ? msg("auth.emailTaken") : msg("auth.signUpFailed");
}

/**
 * Keeps the account's language in line with what this device shows: a choice
 * made on the sign-in page is saved on sign-in, and a new account starts with
 * the language it was created in.
 */
async function rememberLocale(userId: string, { fallbackToResolved }: { fallbackToResolved: boolean }) {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromCookie) ? fromCookie : fallbackToResolved ? await getLocale() : null;
  if (locale) await db.user.update({ where: { id: userId }, data: { locale } });
}

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  try {
    const { user } = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    await rememberLocale(user.id, { fallbackToResolved: false });
  } catch (e) {
    if (e instanceof APIError) return { error: msg("auth.invalidCredentials"), values: echo(formData) };
    throw e;
  }
  const invite = inviteTokenSchema.safeParse(formData.get("invite"));
  redirect(invite.success ? (`/invite/${invite.data}` as Route) : "/dashboard");
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("invite")) return signUpWithInvite(formData);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const { name, email, password, companyName } = parsed.data;

  let userId: string;
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
    userId = result.user.id;
    await rememberLocale(userId, { fallbackToResolved: true });
  } catch (e) {
    if (e instanceof APIError) return { error: signUpError(e), values: echo(formData) };
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
  if (!parsed.success) return invalid(parsed.error, formData);

  const org = await createOrganizationForUser(user.id, parsed.data.companyName);
  (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, cookieOptions);
  redirect("/dashboard");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  redirect("/login");
}

/** Sign-up from an invitation link: creates the account and joins the inviting organization. */
async function signUpWithInvite(formData: FormData): Promise<FormState> {
  const parsed = signUpWithInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const { name, email, password, invite } = parsed.data;

  let user: { id: string; email: string };
  try {
    user = (await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() })).user;
    await rememberLocale(user.id, { fallbackToResolved: true });
  } catch (e) {
    if (e instanceof APIError) return { error: signUpError(e), values: echo(formData) };
    throw e;
  }
  try {
    const organizationId = await acceptInvitation(user, invite);
    (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, cookieOptions);
  } catch (e) {
    // The account exists; without a valid invite the user sets up their own company.
    if (e instanceof TeamError) redirect("/onboarding");
    throw e;
  }
  redirect("/dashboard");
}
