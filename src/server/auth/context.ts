import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { MembershipRole } from "@/generated/prisma/client";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";

export const ACTIVE_ORG_COOKIE = "cp_active_org";

/**
 * Everything a repository needs to scope a query. Only ever constructed here,
 * from a verified session + membership — never from request input.
 */
export interface OrgContext {
  userId: string;
  organizationId: string;
  role: MembershipRole;
}

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/**
 * Resolves the organization for this request. The active-org cookie is only a
 * preference: it is honoured only if the user has a Membership for it,
 * otherwise we fall back to the user's first membership.
 */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const session = await getSession();
  if (!session) return null;

  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });
  if (memberships.length === 0) return null;

  const membership = memberships.find((m) => m.organizationId === preferred) ?? memberships[0]!;
  return { userId: session.user.id, organizationId: membership.organizationId, role: membership.role };
});

/** For pages and actions inside the app: redirects when unauthenticated or without an organization. */
export async function requireOrgContext(): Promise<OrgContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  const ctx = await getOrgContext();
  if (!ctx) redirect("/onboarding");
  return ctx;
}

const ROLE_RANK: Record<MembershipRole, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

export async function requireRole(minimum: MembershipRole): Promise<OrgContext> {
  const ctx = await requireOrgContext();
  if (ROLE_RANK[ctx.role] < ROLE_RANK[minimum]) throw new Error("Forbidden");
  return ctx;
}
