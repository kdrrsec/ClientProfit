"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { msg } from "@/i18n/translate";
import { normalizeDomain } from "@/lib/domain-lookup";
import type { FormState } from "@/lib/validation/auth";
import { clientSchema, notesSchema, quickClientSchema, type DomainInput } from "@/lib/validation/records";
import { requireOrgContext } from "@/server/auth/context";
import { createClient, createClientWithDomain, deleteClient, setClientArchived, updateClient } from "@/server/repositories/clients";
import { lookupDomain } from "@/server/lookup/domain";
import { domainExists } from "@/server/repositories/records";
import { getFinancialSettings } from "@/server/services/profitability";
import { failure, guarded, invalid, requireId } from "./helpers";

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const client = await createClient(ctx, parsed.data);
  revalidatePath("/", "layout");
  redirect(`/clients/${client.id}/setup?step=services` as Route);
}

const addYear = (d: Date) => new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));

/** Quick add: a name and a domain. Registry data comes from the lookup; prices may follow later. */
export async function quickCreateClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  const parsed = quickClientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const q = parsed.data;

  const domain = q.domain ? normalizeDomain(q.domain) : null;
  if (q.domain && !domain) return failure(msg("err.fixHighlighted"), formData, { domain: [msg("err.domainFormat")] });
  const addDomain = domain !== null && q.manageDomain;
  if (addDomain && (await domainExists(ctx, domain))) {
    return failure(msg("err.fixHighlighted"), formData, { domain: [msg("err.domainTaken")] });
  }

  const { today } = await getFinancialSettings(ctx);
  // Submitted before the lookup in the form finished: look it up here instead.
  if (addDomain && !q.registeredAt && !q.renewalDate) {
    const found = await lookupDomain(domain, today);
    q.registrar ??= found.registrar;
    q.registeredAt = found.registeredAt;
    q.renewalDate = found.renewalDate;
  }
  const registeredAt = q.registeredAt ?? today;
  const renewalDate = q.renewalDate && q.renewalDate >= registeredAt ? q.renewalDate : addYear(registeredAt > today ? registeredAt : today);
  const domainData: DomainInput | null = addDomain
    ? {
        domain,
        registrar: q.registrar,
        purchaseCost: "0",
        renewalCost: q.renewalCost,
        sellingPrice: q.sellingPrice,
        registeredAt,
        renewalDate,
        autoRenew: true,
        status: "ACTIVE",
        cancelledAt: null,
        notes: null,
      }
    : null;

  const client = await createClientWithDomain(
    ctx,
    {
      companyName: q.companyName,
      website: domain ? `https://${domain}` : null,
      status: "ACTIVE",
      country: "NL",
      startDate: today,
      contactName: null,
      email: null,
      phone: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      vatNumber: null,
      chamberOfCommerce: null,
      contractRenewalDate: null,
      notes: null,
    },
    domainData,
  );
  revalidatePath("/", "layout");
  redirect(`/clients/${client.id}/setup?step=services` as Route);
}

export async function updateClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  const clientId = requireId(formData, "clientId");
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const error = await guarded(formData, () => updateClient(ctx, clientId, parsed.data));
  if (error) return error;
  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}` as Route);
}

export async function updateNotesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  const clientId = requireId(formData, "clientId");
  const parsed = notesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const error = await guarded(formData, () => updateClient(ctx, clientId, { notes: parsed.data.notes }));
  if (error) return error;
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function archiveClientAction(formData: FormData) {
  const ctx = await requireOrgContext();
  const clientId = requireId(formData, "clientId");
  await setClientArchived(ctx, clientId, formData.get("archive") === "true");
  revalidatePath("/", "layout");
  redirect(`/clients/${clientId}` as Route);
}

export async function deleteClientAction(formData: FormData) {
  const ctx = await requireOrgContext();
  await deleteClient(ctx, requireId(formData, "clientId"));
  revalidatePath("/", "layout");
  redirect("/clients");
}
