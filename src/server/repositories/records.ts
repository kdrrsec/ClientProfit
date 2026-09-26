import "server-only";
import type { CostInput, DomainInput, HostingInput, ServiceInput, TimeEntryInput } from "@/lib/validation/records";
import type { OrgContext } from "@/server/auth/context";
import { db } from "@/server/db";
import { assertAffected, NotFoundError } from "@/server/errors";
import { assertClientInOrg } from "./clients";

/**
 * Org-scoped CRUD for records that belong to a client. Every read and write
 * filters on organizationId; creates verify the client first (the composite
 * FK would reject a foreign client too, but this gives a clean 404).
 * Each function returns/accepts the owning clientId so callers can redirect.
 */

const scope = (ctx: OrgContext, id: string) => ({ id, organizationId: ctx.organizationId });

async function owner<T extends { clientId: string } | null>(record: Promise<T>, what: string) {
  const r = await record;
  if (!r) throw new NotFoundError(what);
  return r;
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function createService(ctx: OrgContext, clientId: string, data: ServiceInput) {
  await assertClientInOrg(ctx, clientId);
  return db.service.create({ data: { ...data, clientId, organizationId: ctx.organizationId } });
}
export async function getService(ctx: OrgContext, id: string) {
  return owner(db.service.findFirst({ where: scope(ctx, id) }), "Service");
}
export async function updateService(ctx: OrgContext, id: string, data: ServiceInput) {
  assertAffected(await db.service.updateMany({ where: scope(ctx, id), data }), "Service");
}
export async function deleteService(ctx: OrgContext, id: string) {
  assertAffected(await db.service.deleteMany({ where: scope(ctx, id) }), "Service");
}

// ─── Domains ─────────────────────────────────────────────────────────────────

export async function createDomain(ctx: OrgContext, clientId: string, data: DomainInput) {
  await assertClientInOrg(ctx, clientId);
  return db.domain.create({ data: { ...data, clientId, organizationId: ctx.organizationId } });
}
export async function getDomain(ctx: OrgContext, id: string) {
  return owner(db.domain.findFirst({ where: scope(ctx, id) }), "Domain");
}
export async function updateDomain(ctx: OrgContext, id: string, data: DomainInput) {
  assertAffected(await db.domain.updateMany({ where: scope(ctx, id), data }), "Domain");
}
export async function deleteDomain(ctx: OrgContext, id: string) {
  assertAffected(await db.domain.deleteMany({ where: scope(ctx, id) }), "Domain");
}
export async function domainExists(ctx: OrgContext, domain: string, exceptId?: string) {
  const count = await db.domain.count({
    where: { organizationId: ctx.organizationId, domain, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
  return count > 0;
}

// ─── Hosting ─────────────────────────────────────────────────────────────────

export async function createHosting(ctx: OrgContext, clientId: string, data: HostingInput) {
  await assertClientInOrg(ctx, clientId);
  return db.hosting.create({ data: { ...data, clientId, organizationId: ctx.organizationId } });
}
export async function getHosting(ctx: OrgContext, id: string) {
  return owner(db.hosting.findFirst({ where: scope(ctx, id) }), "Hosting");
}
export async function updateHosting(ctx: OrgContext, id: string, data: HostingInput) {
  assertAffected(await db.hosting.updateMany({ where: scope(ctx, id), data }), "Hosting");
}
export async function deleteHosting(ctx: OrgContext, id: string) {
  assertAffected(await db.hosting.deleteMany({ where: scope(ctx, id) }), "Hosting");
}

// ─── Other costs ─────────────────────────────────────────────────────────────

export async function createCost(ctx: OrgContext, clientId: string, data: CostInput) {
  await assertClientInOrg(ctx, clientId);
  return db.cost.create({ data: { ...data, clientId, organizationId: ctx.organizationId } });
}
export async function getCost(ctx: OrgContext, id: string) {
  return owner(db.cost.findFirst({ where: scope(ctx, id) }), "Cost");
}
export async function updateCost(ctx: OrgContext, id: string, data: CostInput) {
  assertAffected(await db.cost.updateMany({ where: scope(ctx, id), data }), "Cost");
}
export async function deleteCost(ctx: OrgContext, id: string) {
  assertAffected(await db.cost.deleteMany({ where: scope(ctx, id) }), "Cost");
}

// ─── Time entries ────────────────────────────────────────────────────────────

export async function createTimeEntry(ctx: OrgContext, clientId: string, data: TimeEntryInput) {
  await assertClientInOrg(ctx, clientId);
  return db.timeEntry.create({ data: { ...data, clientId, userId: ctx.userId, organizationId: ctx.organizationId } });
}
export async function getTimeEntry(ctx: OrgContext, id: string) {
  return owner(db.timeEntry.findFirst({ where: scope(ctx, id) }), "Time entry");
}
export async function updateTimeEntry(ctx: OrgContext, id: string, data: TimeEntryInput) {
  assertAffected(await db.timeEntry.updateMany({ where: scope(ctx, id), data }), "Time entry");
}
export async function deleteTimeEntry(ctx: OrgContext, id: string) {
  assertAffected(await db.timeEntry.deleteMany({ where: scope(ctx, id) }), "Time entry");
}
