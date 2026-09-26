import "server-only";
import type { OrgContext } from "@/server/auth/context";
import { db } from "@/server/db";

/**
 * Non-archived clients with every record the profitability engine needs.
 * Time entries are limited to `timeEntriesSince` to bound the payload.
 */
export async function listClientsWithFinancials(ctx: OrgContext, opts: { timeEntriesSince: Date }) {
  return db.client.findMany({
    where: { organizationId: ctx.organizationId, archivedAt: null },
    orderBy: { companyName: "asc" },
    include: {
      services: { where: { organizationId: ctx.organizationId } },
      domains: { where: { organizationId: ctx.organizationId } },
      hosting: { where: { organizationId: ctx.organizationId } },
      costs: { where: { organizationId: ctx.organizationId } },
      timeEntries: {
        where: { organizationId: ctx.organizationId, date: { gte: opts.timeEntriesSince } },
        select: { date: true, hours: true, hourlyCost: true },
      },
    },
  });
}

export type ClientWithFinancials = Awaited<ReturnType<typeof listClientsWithFinancials>>[number];
