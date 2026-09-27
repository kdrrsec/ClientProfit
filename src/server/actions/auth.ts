"use server";

import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createOrganizationSchema, signInSchema, signUpSchema, signUpWithInviteSchema, type FormState } from "@/lib/validation/auth";
import { inviteTokenSchema } from "@/lib/validation/team";
import type { Route } from "next";
import { auth } from "@/server/auth/auth";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/server/auth/context";
import { createOrganizationForUser } from "@/server/repositories/organizations";
import { acceptInvitation, TeamError } from "@/server/repositories/team";
import { echo, invalid } from "./helpers";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError) return { error: "Invalid email or password", values: echo(formData) };
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
  } catch (e) {
    if (e instanceof APIError) return { error: e.message || "Could not create account", values: echo(formData) };
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
