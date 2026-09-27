import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { MembershipRole } from "@/generated/prisma/client";
import type { OrgContext } from "@/server/auth/context";
import { db } from "@/server/db";
import { assertAffected, NotFoundError } from "@/server/errors";

export const INVITE_TTL_DAYS = 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export class TeamError extends Error {}

export async function listMembers(ctx: OrgContext) {
  return db.membership.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, role: true, createdAt: true, userId: true, user: { select: { name: true, email: true } } },
  });
}

export async function listPendingInvitations(ctx: OrgContext) {
  return db.invitation.findMany({
    where: { organizationId: ctx.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, expiresAt: true, invitedBy: { select: { name: true } } },
  });
}

/**
 * Creates an invitation and returns the plain token (only ever returned
 * here). Re-inviting the same email replaces the previous pending invite.
 */
export async function createInvitation(ctx: OrgContext, email: string, role: Exclude<MembershipRole, "OWNER">) {
  const existingMember = await db.membership.count({
    where: { organizationId: ctx.organizationId, user: { email: { equals: email, mode: "insensitive" } } },
  });
  if (existingMember > 0) throw new TeamError("This person is already a member of your organization.");

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.invitation.deleteMany({ where: { organizationId: ctx.organizationId, email, acceptedAt: null } }),
    db.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email,
        role,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        invitedById: ctx.userId,
      },
    }),
  ]);
  return token;
}

export async function revokeInvitation(ctx: OrgContext, invitationId: string) {
  assertAffected(
    await db.invitation.deleteMany({ where: { id: invitationId, organizationId: ctx.organizationId, acceptedAt: null } }),
    "Invitation",
  );
}

/** Owners can't be changed or removed here; nobody can be made owner. */
async function editableMembership(ctx: OrgContext, membershipId: string) {
  const m = await db.membership.findFirst({ where: { id: membershipId, organizationId: ctx.organizationId } });
  if (!m) throw new NotFoundError("Member");
  if (m.role === "OWNER") throw new TeamError("The owner's role can't be changed.");
  if (m.userId === ctx.userId) throw new TeamError("You can't change your own membership.");
  return m;
}

export async function changeMemberRole(ctx: OrgContext, membershipId: string, role: Exclude<MembershipRole, "OWNER">) {
  await editableMembership(ctx, membershipId);
  await db.membership.updateMany({ where: { id: membershipId, organizationId: ctx.organizationId }, data: { role } });
}

export async function removeMember(ctx: OrgContext, membershipId: string) {
  await editableMembership(ctx, membershipId);
  await db.membership.deleteMany({ where: { id: membershipId, organizationId: ctx.organizationId } });
}

/** Looks up a still-valid invitation. The token itself is the credential, so this is not org-scoped. */
export async function findValidInvitation(token: string) {
  const invite = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, email: true, role: true, expiresAt: true, acceptedAt: true, organizationId: true, organization: { select: { name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return null;
  return invite;
}

/**
 * Accepts an invitation for a signed-in user. The user's email must match
 * the invited email, so a forwarded link can't be used by someone else.
 */
export async function acceptInvitation(user: { id: string; email: string }, token: string) {
  return db.$transaction(async (tx) => {
    const invite = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) throw new TeamError("This invitation is no longer valid.");
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new TeamError(`This invitation is for ${invite.email}. Sign in with that email address to accept it.`);
    }
    // Claim the invite atomically so it can only be used once.
    const claimed = await tx.invitation.updateMany({ where: { id: invite.id, acceptedAt: null }, data: { acceptedAt: new Date() } });
    if (claimed.count === 0) throw new TeamError("This invitation is no longer valid.");
    await tx.membership.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
      create: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
      update: {},
    });
    return invite.organizationId;
  });
}

export async function isMember(userId: string, organizationId: string) {
  return (await db.membership.count({ where: { userId, organizationId } })) > 0;
}
