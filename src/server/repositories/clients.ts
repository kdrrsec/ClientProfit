import "server-only";
import type { ClientStatus, Prisma } from "@/generated/prisma/client";
import type { ClientInput } from "@/lib/validation/records";
import type { OrgContext } from "@/server/auth/context";
import { db } from "@/server/db";
import { assertAffected, NotFoundError } from "@/server/errors";

const financialsInclude = (ctx: OrgContext, timeEntriesSince?: Date) =>
  ({
    services: { where: { organizationId: ctx.organizationId }, orderBy: [{ startDate: "asc" }, { name: "asc" }] },
    domains: { where: { organizationId: ctx.organizationId }, orderBy: { domain: "asc" } },
    hosting: { where: { organizationId: ctx.organizationId }, orderBy: { product: "asc" } },
    costs: { where: { organizationId: ctx.organizationId }, orderBy: { name: "asc" } },
    timeEntries: {
      where: { organizationId: ctx.organizationId, ...(timeEntriesSince ? { date: { gte: timeEntriesSince } } : {}) },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    },
  }) satisfies Prisma.ClientInclude;

export interface ClientListFilter {
  search?: string;
  status?: ClientStatus;
  archived?: boolean;
  timeEntriesSince: Date;
}

/**
 * Clients with every record the profitability engine needs.
 * Archived clients are excluded unless `archived: true` (then only archived).
 */
export async function listClientsWithFinancials(ctx: OrgContext, filter: ClientListFilter) {
  const search = filter.search?.trim();
  return db.client.findMany({
    where: {
      organizationId: ctx.organizationId,
      archivedAt: filter.archived ? { not: null } : null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { companyName: "asc" },
    include: financialsInclude(ctx, filter.timeEntriesSince),
  });
}

export type ClientWithFinancials = Awaited<ReturnType<typeof listClientsWithFinancials>>[number];

export async function getClientWithFinancials(ctx: OrgContext, clientId: string) {
  const client = await db.client.findFirst({
    where: { id: clientId, organizationId: ctx.organizationId },
    include: financialsInclude(ctx),
  });
  if (!client) throw new NotFoundError("Client");
  return client;
}

export async function getClient(ctx: OrgContext, clientId: string) {
  const client = await db.client.findFirst({ where: { id: clientId, organizationId: ctx.organizationId } });
  if (!client) throw new NotFoundError("Client");
  return client;
}

/** Throws unless the client belongs to the caller's organization. */
export async function assertClientInOrg(ctx: OrgContext, clientId: string) {
  const count = await db.client.count({ where: { id: clientId, organizationId: ctx.organizationId } });
  if (count === 0) throw new NotFoundError("Client");
}

export async function createClient(ctx: OrgContext, data: ClientInput) {
  return db.client.create({ data: { ...data, organizationId: ctx.organizationId } });
}

export async function updateClient(ctx: OrgContext, clientId: string, data: Partial<ClientInput>) {
  assertAffected(await db.client.updateMany({ where: { id: clientId, organizationId: ctx.organizationId }, data }), "Client");
}

export async function setClientArchived(ctx: OrgContext, clientId: string, archived: boolean) {
  assertAffected(
    await db.client.updateMany({
      where: { id: clientId, organizationId: ctx.organizationId },
      data: { archivedAt: archived ? new Date() : null },
    }),
    "Client",
  );
}

/** Hard delete; services, domains, hosting, costs and time entries cascade. */
export async function deleteClient(ctx: OrgContext, clientId: string) {
  assertAffected(await db.client.deleteMany({ where: { id: clientId, organizationId: ctx.organizationId } }), "Client");
}
