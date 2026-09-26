import "server-only";
import type { CostCategory, DomainStatus, Prisma } from "@/generated/prisma/client";
import type { OrgContext } from "@/server/auth/context";
import { db } from "@/server/db";

/** Org-wide lists for the Domains, Hosting, Costs and Time sections. Always scoped to ctx.organizationId. */

const clientRef = { select: { id: true, companyName: true, archivedAt: true } } as const;
const contains = (q?: string) => (q ? { contains: q, mode: "insensitive" as const } : undefined);

export async function listClientOptions(ctx: OrgContext) {
  return db.client.findMany({
    where: { organizationId: ctx.organizationId, archivedAt: null },
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true },
  });
}

export async function listDomainsForOrg(ctx: OrgContext, f: { search?: string; status?: DomainStatus; clientId?: string; renewalBefore?: Date }) {
  return db.domain.findMany({
    where: {
      organizationId: ctx.organizationId,
      AND: [
        f.status ? { status: f.status } : {},
        f.clientId ? { clientId: f.clientId } : {},
        f.renewalBefore ? { renewalDate: { lte: f.renewalBefore }, status: { not: "CANCELLED" as const } } : {},
        f.search ? { OR: [{ domain: contains(f.search) }, { registrar: contains(f.search) }, { client: { companyName: contains(f.search) } }] } : {},
      ],
    },
    orderBy: [{ renewalDate: "asc" }, { domain: "asc" }],
    include: { client: clientRef },
  });
}

export async function listHostingForOrg(ctx: OrgContext, f: { search?: string; clientId?: string }) {
  return db.hosting.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(f.clientId ? { clientId: f.clientId } : {}),
      ...(f.search
        ? { OR: [{ product: contains(f.search) }, { provider: contains(f.search) }, { server: contains(f.search) }, { client: { companyName: contains(f.search) } }] }
        : {}),
    },
    orderBy: [{ product: "asc" }],
    include: { client: clientRef },
  });
}

export async function listCostsForOrg(ctx: OrgContext, f: { search?: string; category?: CostCategory; clientId?: string }) {
  return db.cost.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(f.category ? { category: f.category } : {}),
      ...(f.clientId ? { clientId: f.clientId } : {}),
      ...(f.search ? { OR: [{ name: contains(f.search) }, { notes: contains(f.search) }, { client: { companyName: contains(f.search) } }] } : {}),
    },
    orderBy: [{ name: "asc" }],
    include: { client: clientRef },
  });
}

export interface TimeFilter {
  search?: string;
  clientId?: string;
  from?: Date;
  to?: Date;
}

function timeWhere(ctx: OrgContext, f: TimeFilter): Prisma.TimeEntryWhereInput {
  return {
    organizationId: ctx.organizationId,
    ...(f.clientId ? { clientId: f.clientId } : {}),
    ...(f.from || f.to ? { date: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {}),
    ...(f.search ? { description: contains(f.search) } : {}),
  };
}

export async function listTimeEntriesForOrg(ctx: OrgContext, f: TimeFilter, page: { skip: number; take: number }) {
  const where = timeWhere(ctx, f);
  const [entries, total] = await Promise.all([
    db.timeEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: page.skip,
      take: page.take,
      include: { client: clientRef, user: { select: { name: true } } },
    }),
    db.timeEntry.count({ where }),
  ]);
  return { entries, total };
}

/** Hours and rate per entry for totals; labour cost is computed by the engine, not in SQL. */
export async function listTimeEntryAmounts(ctx: OrgContext, f: TimeFilter) {
  return db.timeEntry.findMany({ where: timeWhere(ctx, f), select: { date: true, hours: true, hourlyCost: true } });
}
