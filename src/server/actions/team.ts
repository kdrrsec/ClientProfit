"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { msg } from "@/i18n/translate";
import type { FormState } from "@/lib/validation/auth";
import { inviteSchema, inviteTokenSchema, roleChangeSchema } from "@/lib/validation/team";
import { ACTIVE_ORG_COOKIE, requireOrgContext, requireUser } from "@/server/auth/context";
import { NotFoundError } from "@/server/errors";
import * as team from "@/server/repositories/team";
import { failure, invalid, requireId } from "./helpers";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

async function requireManager() {
  const ctx = await requireOrgContext();
  if (ctx.role === "MEMBER") throw new team.TeamError(msg("err.adminOnlyTeam"));
  return ctx;
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function inviteMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  try {
    const ctx = await requireManager();
    const token = await team.createInvitation(ctx, parsed.data.email, parsed.data.role);
    revalidatePath("/settings/team");
    return { inviteUrl: `${await origin()}/invite/${token}` };
  } catch (e) {
    if (e instanceof team.TeamError) return failure(e.message, formData);
    throw e;
  }
}

/** Mutations below report problems via a redirect flag; they are plain form posts. */
async function run(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof team.TeamError || e instanceof NotFoundError) redirect(`/settings/team?error=${encodeURIComponent(e.message)}` as Route);
    throw e;
  }
  revalidatePath("/settings/team");
  redirect("/settings/team");
}

export async function revokeInvitationAction(formData: FormData) {
  await run(async () => team.revokeInvitation(await requireManager(), requireId(formData, "id")));
}

export async function changeRoleAction(formData: FormData) {
  const parsed = roleChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings/team");
  await run(async () => team.changeMemberRole(await requireManager(), parsed.data.membershipId, parsed.data.role));
}

export async function removeMemberAction(formData: FormData) {
  await run(async () => team.removeMember(await requireManager(), requireId(formData, "membershipId")));
}

export async function acceptInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const token = inviteTokenSchema.safeParse(formData.get("token"));
  if (!token.success) return failure(msg("err.inviteLinkInvalid"), formData);
  let organizationId: string;
  try {
    organizationId = await team.acceptInvitation(user, token.data);
  } catch (e) {
    if (e instanceof team.TeamError) return failure(e.message, formData);
    throw e;
  }
  (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, cookieOptions);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Switches the active organization. The cookie is only honoured for orgs the user is a member of. */
export async function switchOrganizationAction(formData: FormData) {
  const user = await requireUser();
  const organizationId = requireId(formData, "organizationId");
  if (await team.isMember(user.id, organizationId)) {
    (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, cookieOptions);
    revalidatePath("/", "layout");
  }
  redirect("/dashboard");
}
