import "server-only";
import type { SettingsInput } from "@/lib/validation/settings";
import type { OrgContext } from "@/server/auth/context";
import { db } from "@/server/db";

export async function getOrganization(ctx: OrgContext) {
  return db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
}

export async function listUserOrganizations(userId: string) {
  return db.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { role: true, organization: { select: { id: true, name: true } } },
  });
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "org";
}

/** Creates an organization with the given user as OWNER. Not org-scoped: this is how a scope comes into existence. */
export async function createOrganizationForUser(userId: string, name: string) {
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;
  return db.organization.create({
    data: { name, slug, memberships: { create: { userId, role: "OWNER" } } },
  });
}

/** Updates the caller's own organization only; the id always comes from the verified context. */
export async function updateOrganizationSettings(ctx: OrgContext, data: SettingsInput) {
  return db.organization.update({ where: { id: ctx.organizationId }, data });
}
