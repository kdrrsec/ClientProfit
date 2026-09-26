import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasTestDatabase } from "@/test/setup";
import type { OrgContext } from "@/server/auth/context";

/**
 * Tenant isolation: a user of organization B must never read, change or
 * delete organization A's data — through any repository function, and not
 * even through a raw insert (composite foreign keys).
 */
describe.skipIf(!hasTestDatabase)("tenant isolation (database)", async () => {
  if (!hasTestDatabase) return;
  const { db } = await import("@/server/db");
  const clients = await import("./clients");
  const records = await import("./records");
  const { NotFoundError } = await import("@/server/errors");
  const sections = await import("./sections");

  const tag = `iso-${Date.now()}`;
  let ctxA: OrgContext;
  let ctxB: OrgContext;
  const ids = { client: "", service: "", domain: "", hosting: "", cost: "", time: "" };

  const service = { name: "Website", type: "WEBSITE" as const, description: null, billingInterval: "MONTHLY" as const, sellingPrice: "89", supplier: null, supplierCost: "0", costInterval: null, startDate: new Date("2026-01-01"), endDate: null, isActive: true };
  const domain = { domain: `${tag}.nl`, registrar: null, purchaseCost: "0", renewalCost: "12", sellingPrice: "24", registeredAt: new Date("2026-01-01"), renewalDate: new Date("2027-01-01"), autoRenew: true, status: "ACTIVE" as const, cancelledAt: null, notes: null };
  const hosting = { product: "VPS", provider: null, server: null, billingInterval: "MONTHLY" as const, purchaseCost: "5", sellingPrice: "15", startDate: new Date("2026-01-01"), endDate: null, renewalDate: null, notes: null };
  const cost = { name: "Plugin", category: "PLUGIN" as const, amount: "10", billingInterval: "MONTHLY" as const, startDate: new Date("2026-01-01"), endDate: null, renewalDate: null, notes: null };
  const time = { date: new Date("2026-09-01"), description: "Work", hours: "2", hourlyCost: "50" };
  const clientInput = { companyName: "Acme A", contactName: null, email: null, phone: null, website: null, addressLine1: null, addressLine2: null, postalCode: null, city: null, country: null, vatNumber: null, chamberOfCommerce: null, status: "ACTIVE" as const, startDate: null, contractRenewalDate: null, notes: null };

  beforeAll(async () => {
    const mk = async (name: string): Promise<OrgContext> => {
      const user = await db.user.create({ data: { name, email: `${name}-${tag}@example.com` } });
      const org = await db.organization.create({ data: { name, slug: `${name}-${tag}`, memberships: { create: { userId: user.id, role: "OWNER" } } } });
      return { userId: user.id, organizationId: org.id, role: "OWNER" };
    };
    ctxA = await mk("a");
    ctxB = await mk("b");
    const c = await clients.createClient(ctxA, clientInput);
    ids.client = c.id;
    ids.service = (await records.createService(ctxA, c.id, service)).id;
    ids.domain = (await records.createDomain(ctxA, c.id, domain)).id;
    ids.hosting = (await records.createHosting(ctxA, c.id, hosting)).id;
    ids.cost = (await records.createCost(ctxA, c.id, cost)).id;
    ids.time = (await records.createTimeEntry(ctxA, c.id, time)).id;
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { slug: { endsWith: tag } } });
    await db.user.deleteMany({ where: { email: { endsWith: `${tag}@example.com` } } });
    await db.$disconnect();
  });

  it("owner can read their own data", async () => {
    const c = await clients.getClientWithFinancials(ctxA, ids.client);
    expect(c.services).toHaveLength(1);
    expect(c.timeEntries).toHaveLength(1);
  });

  it("hides another organization's clients from lists and lookups", async () => {
    const list = await clients.listClientsWithFinancials(ctxB, { timeEntriesSince: new Date("2000-01-01") });
    expect(list.map((c) => c.id)).not.toContain(ids.client);
    await expect(clients.getClient(ctxB, ids.client)).rejects.toBeInstanceOf(NotFoundError);
    await expect(clients.getClientWithFinancials(ctxB, ids.client)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("blocks updating, archiving and deleting another organization's client", async () => {
    await expect(clients.updateClient(ctxB, ids.client, { companyName: "Hacked" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(clients.setClientArchived(ctxB, ids.client, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(clients.deleteClient(ctxB, ids.client)).rejects.toBeInstanceOf(NotFoundError);
    const c = await clients.getClient(ctxA, ids.client);
    expect(c.companyName).toBe("Acme A");
    expect(c.archivedAt).toBeNull();
  });

  const cases = [
    { what: "service", get: records.getService, update: (ctx: OrgContext, id: string) => records.updateService(ctx, id, { ...service, name: "Hacked" }), del: records.deleteService, create: (ctx: OrgContext, clientId: string) => records.createService(ctx, clientId, service), key: "service" as const },
    { what: "domain", get: records.getDomain, update: (ctx: OrgContext, id: string) => records.updateDomain(ctx, id, { ...domain, notes: "Hacked" }), del: records.deleteDomain, create: (ctx: OrgContext, clientId: string) => records.createDomain(ctx, clientId, { ...domain, domain: `x-${tag}.nl` }), key: "domain" as const },
    { what: "hosting", get: records.getHosting, update: (ctx: OrgContext, id: string) => records.updateHosting(ctx, id, { ...hosting, product: "Hacked" }), del: records.deleteHosting, create: (ctx: OrgContext, clientId: string) => records.createHosting(ctx, clientId, hosting), key: "hosting" as const },
    { what: "cost", get: records.getCost, update: (ctx: OrgContext, id: string) => records.updateCost(ctx, id, { ...cost, name: "Hacked" }), del: records.deleteCost, create: (ctx: OrgContext, clientId: string) => records.createCost(ctx, clientId, cost), key: "cost" as const },
    { what: "time entry", get: records.getTimeEntry, update: (ctx: OrgContext, id: string) => records.updateTimeEntry(ctx, id, { ...time, description: "Hacked" }), del: records.deleteTimeEntry, create: (ctx: OrgContext, clientId: string) => records.createTimeEntry(ctx, clientId, time), key: "time" as const },
  ];

  for (const c of cases) {
    it(`blocks reading, changing, deleting and attaching a ${c.what} across organizations`, async () => {
      const id = ids[c.key];
      await expect(c.get(ctxB, id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(c.update(ctxB, id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(c.del(ctxB, id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(c.create(ctxB, ids.client)).rejects.toBeInstanceOf(NotFoundError);
      // Still intact for the owner.
      await expect(c.get(ctxA, id)).resolves.toMatchObject({ clientId: ids.client });
    });
  }

  it("org-wide section lists never include another organization's records", async () => {
    const f = {};
    expect((await sections.listClientOptions(ctxB)).map((c) => c.id)).not.toContain(ids.client);
    expect(await sections.listDomainsForOrg(ctxB, f)).toHaveLength(0);
    expect(await sections.listHostingForOrg(ctxB, f)).toHaveLength(0);
    expect(await sections.listCostsForOrg(ctxB, f)).toHaveLength(0);
    expect((await sections.listTimeEntriesForOrg(ctxB, f, { skip: 0, take: 50 })).total).toBe(0);
    expect(await sections.listTimeEntryAmounts(ctxB, f)).toHaveLength(0);
    // Filtering B's lists by A's client id still returns nothing.
    expect(await sections.listDomainsForOrg(ctxB, { clientId: ids.client })).toHaveLength(0);
    // Owner sees their own.
    expect(await sections.listDomainsForOrg(ctxA, f)).toHaveLength(1);
    expect((await sections.listTimeEntriesForOrg(ctxA, { clientId: ids.client }, { skip: 0, take: 50 })).total).toBe(1);
  });

  it("the database rejects a record pointing at another organization's client", async () => {
    await expect(
      db.service.create({ data: { ...service, organizationId: ctxB.organizationId, clientId: ids.client } }),
    ).rejects.toThrow();
    await expect(
      db.timeEntry.create({ data: { ...time, organizationId: ctxB.organizationId, clientId: ids.client } }),
    ).rejects.toThrow();
  });

  it("owner can delete their client, cascading its records", async () => {
    await clients.deleteClient(ctxA, ids.client);
    expect(await db.service.count({ where: { clientId: ids.client } })).toBe(0);
    expect(await db.timeEntry.count({ where: { clientId: ids.client } })).toBe(0);
  });
});
