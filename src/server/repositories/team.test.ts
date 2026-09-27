import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasTestDatabase } from "@/test/setup";
import type { OrgContext } from "@/server/auth/context";

describe.skipIf(!hasTestDatabase)("team invitations (database)", async () => {
  if (!hasTestDatabase) return;
  const { db } = await import("@/server/db");
  const team = await import("./team");
  const { NotFoundError } = await import("@/server/errors");

  const tag = `team-${Date.now()}`;
  let owner: OrgContext;
  let otherOrg: OrgContext;
  const invitee = { id: "", email: `invitee-${tag}@example.com` };
  const stranger = { id: "", email: `stranger-${tag}@example.com` };

  beforeAll(async () => {
    const mk = async (name: string): Promise<OrgContext> => {
      const user = await db.user.create({ data: { name, email: `${name}-${tag}@example.com` } });
      const org = await db.organization.create({ data: { name, slug: `${name}-${tag}`, memberships: { create: { userId: user.id, role: "OWNER" } } } });
      return { userId: user.id, organizationId: org.id, role: "OWNER" };
    };
    owner = await mk("owner");
    otherOrg = await mk("other");
    invitee.id = (await db.user.create({ data: { name: "Invitee", email: invitee.email } })).id;
    stranger.id = (await db.user.create({ data: { name: "Stranger", email: stranger.email } })).id;
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { slug: { endsWith: tag } } });
    await db.user.deleteMany({ where: { email: { endsWith: `${tag}@example.com` } } });
    await db.$disconnect();
  });

  it("stores only a hash of the token", async () => {
    const token = await team.createInvitation(owner, invitee.email, "MEMBER");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rows = await db.invitation.findMany({ where: { organizationId: owner.organizationId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toContain(token);
    expect(await team.findValidInvitation(token)).toMatchObject({ email: invitee.email, role: "MEMBER" });
  });

  it("re-inviting replaces the pending invitation (old link stops working)", async () => {
    const first = await team.createInvitation(owner, invitee.email, "MEMBER");
    const second = await team.createInvitation(owner, invitee.email, "ADMIN");
    expect(await team.findValidInvitation(first)).toBeNull();
    expect(await team.findValidInvitation(second)).toMatchObject({ role: "ADMIN" });
  });

  it("only the invited email can accept, and only once", async () => {
    const token = await team.createInvitation(owner, invitee.email, "MEMBER");
    await expect(team.acceptInvitation(stranger, token)).rejects.toBeInstanceOf(team.TeamError);
    expect(await team.isMember(stranger.id, owner.organizationId)).toBe(false);

    const orgId = await team.acceptInvitation({ id: invitee.id, email: invitee.email.toUpperCase() }, token);
    expect(orgId).toBe(owner.organizationId);
    expect(await team.isMember(invitee.id, owner.organizationId)).toBe(true);

    await expect(team.acceptInvitation(invitee, token)).rejects.toBeInstanceOf(team.TeamError);
    await expect(team.createInvitation(owner, invitee.email, "MEMBER")).rejects.toThrow(/already a member/);
  });

  it("expired invitations can't be used", async () => {
    const email = `late-${tag}@example.com`;
    const token = await team.createInvitation(owner, email, "MEMBER");
    await db.invitation.updateMany({ where: { email }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await team.findValidInvitation(token)).toBeNull();
    const late = await db.user.create({ data: { name: "Late", email } });
    await expect(team.acceptInvitation(late, token)).rejects.toBeInstanceOf(team.TeamError);
  });

  it("another organization can't revoke invitations or touch members", async () => {
    const email = `pending-${tag}@example.com`;
    await team.createInvitation(owner, email, "MEMBER");
    const invite = await db.invitation.findFirstOrThrow({ where: { email } });
    await expect(team.revokeInvitation(otherOrg, invite.id)).rejects.toBeInstanceOf(NotFoundError);

    const membership = await db.membership.findFirstOrThrow({ where: { userId: invitee.id, organizationId: owner.organizationId } });
    await expect(team.changeMemberRole(otherOrg, membership.id, "ADMIN")).rejects.toBeInstanceOf(NotFoundError);
    await expect(team.removeMember(otherOrg, membership.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await team.listMembers(otherOrg)).map((m) => m.userId)).not.toContain(invitee.id);

    await team.revokeInvitation(owner, invite.id);
    expect(await db.invitation.count({ where: { email } })).toBe(0);
  });

  it("protects the owner and self; admins can change other roles and remove members", async () => {
    const ownerMembership = await db.membership.findFirstOrThrow({ where: { userId: owner.userId, organizationId: owner.organizationId } });
    await expect(team.changeMemberRole(owner, ownerMembership.id, "MEMBER")).rejects.toBeInstanceOf(team.TeamError);
    await expect(team.removeMember(owner, ownerMembership.id)).rejects.toBeInstanceOf(team.TeamError);

    const m = await db.membership.findFirstOrThrow({ where: { userId: invitee.id, organizationId: owner.organizationId } });
    await team.changeMemberRole(owner, m.id, "ADMIN");
    expect((await db.membership.findUniqueOrThrow({ where: { id: m.id } })).role).toBe("ADMIN");
    const asInvitee: OrgContext = { userId: invitee.id, organizationId: owner.organizationId, role: "ADMIN" };
    await expect(team.removeMember(asInvitee, m.id)).rejects.toBeInstanceOf(team.TeamError); // can't remove self
    await team.removeMember(owner, m.id);
    expect(await team.isMember(invitee.id, owner.organizationId)).toBe(false);
  });
});
