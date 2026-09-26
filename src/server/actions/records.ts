"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/validation/auth";
import { costSchema, domainSchema, hostingSchema, serviceSchema, timeEntrySchema } from "@/lib/validation/records";
import { requireOrgContext, type OrgContext } from "@/server/auth/context";
import { NotFoundError } from "@/server/errors";
import * as records from "@/server/repositories/records";
import { getFinancialSettings } from "@/server/services/profitability";
import { failure, guarded, invalid, optionalId, requireId, safeReturnTo } from "./helpers";

/**
 * Create when no `id` is posted, update otherwise. On update we also check
 * the record belongs to the posted client, so a form can't move a record
 * between clients.
 */
async function save<T>(
  formData: FormData,
  parse: (ctx: OrgContext) => Promise<{ ok: true; data: T } | { ok: false; state: FormState }>,
  ops: {
    get: (ctx: OrgContext, id: string) => Promise<{ clientId: string }>;
    create: (ctx: OrgContext, clientId: string, data: T) => Promise<unknown>;
    update: (ctx: OrgContext, id: string, data: T) => Promise<void>;
  },
): Promise<FormState> {
  const ctx = await requireOrgContext();
  const clientId = requireId(formData, "clientId");
  const recordId = optionalId(formData, "id");
  const parsed = await parse(ctx);
  if (!parsed.ok) return parsed.state;

  const error = await guarded(formData, async () => {
    if (recordId) {
      const existing = await ops.get(ctx, recordId);
      if (existing.clientId !== clientId) throw new NotFoundError();
      await ops.update(ctx, recordId, parsed.data);
    } else {
      await ops.create(ctx, clientId, parsed.data);
    }
  });
  if (error) return error;
  revalidatePath("/", "layout");
  redirect(safeReturnTo(formData.get("returnTo"), clientId));
}

async function remove(formData: FormData, ops: { get: (ctx: OrgContext, id: string) => Promise<{ clientId: string }>; del: (ctx: OrgContext, id: string) => Promise<void> }) {
  const ctx = await requireOrgContext();
  const id = requireId(formData, "id");
  const { clientId } = await ops.get(ctx, id);
  await ops.del(ctx, id);
  revalidatePath("/", "layout");
  redirect(safeReturnTo(formData.get("returnTo"), clientId));
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function saveServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return save(
    formData,
    async (ctx) => {
      const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { ok: false, state: invalid(parsed.error, formData) };
      const data = parsed.data;
      // Deactivating without an end date ends the service today, so its history is kept.
      if (!data.isActive && !data.endDate) data.endDate = (await getFinancialSettings(ctx)).today;
      return { ok: true, data };
    },
    { get: records.getService, create: records.createService, update: records.updateService },
  );
}

export async function deleteServiceAction(formData: FormData) {
  await remove(formData, { get: records.getService, del: records.deleteService });
}

// ─── Domains ─────────────────────────────────────────────────────────────────

export async function saveDomainAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return save(
    formData,
    async (ctx) => {
      const parsed = domainSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return { ok: false, state: invalid(parsed.error, formData) };
      const data = parsed.data;
      if (await records.domainExists(ctx, data.domain, optionalId(formData, "id") ?? undefined)) {
        return { ok: false, state: failure("Please fix the highlighted field", formData, { domain: ["This domain is already registered in your organization"] }) };
      }
      // A cancellation without a date ends revenue and cost today.
      if (data.status === "CANCELLED" && !data.cancelledAt) data.cancelledAt = (await getFinancialSettings(ctx)).today;
      if (data.status !== "CANCELLED" && data.status !== "EXPIRED") data.cancelledAt = null;
      return { ok: true, data };
    },
    { get: records.getDomain, create: records.createDomain, update: records.updateDomain },
  );
}

export async function deleteDomainAction(formData: FormData) {
  await remove(formData, { get: records.getDomain, del: records.deleteDomain });
}

// ─── Hosting ─────────────────────────────────────────────────────────────────

export async function saveHostingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return save(
    formData,
    async () => {
      const parsed = hostingSchema.safeParse(Object.fromEntries(formData));
      return parsed.success ? { ok: true, data: parsed.data } : { ok: false, state: invalid(parsed.error, formData) };
    },
    { get: records.getHosting, create: records.createHosting, update: records.updateHosting },
  );
}

export async function deleteHostingAction(formData: FormData) {
  await remove(formData, { get: records.getHosting, del: records.deleteHosting });
}

// ─── Other costs ─────────────────────────────────────────────────────────────

export async function saveCostAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return save(
    formData,
    async () => {
      const parsed = costSchema.safeParse(Object.fromEntries(formData));
      return parsed.success ? { ok: true, data: parsed.data } : { ok: false, state: invalid(parsed.error, formData) };
    },
    { get: records.getCost, create: records.createCost, update: records.updateCost },
  );
}

export async function deleteCostAction(formData: FormData) {
  await remove(formData, { get: records.getCost, del: records.deleteCost });
}

// ─── Time entries ────────────────────────────────────────────────────────────

export async function saveTimeEntryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return save(
    formData,
    async () => {
      const parsed = timeEntrySchema.safeParse(Object.fromEntries(formData));
      return parsed.success ? { ok: true, data: parsed.data } : { ok: false, state: invalid(parsed.error, formData) };
    },
    { get: records.getTimeEntry, create: records.createTimeEntry, update: records.updateTimeEntry },
  );
}

export async function deleteTimeEntryAction(formData: FormData) {
  await remove(formData, { get: records.getTimeEntry, del: records.deleteTimeEntry });
}
