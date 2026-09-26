"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/validation/auth";
import { clientSchema, notesSchema } from "@/lib/validation/records";
import { requireOrgContext } from "@/server/auth/context";
import { createClient, deleteClient, setClientArchived, updateClient } from "@/server/repositories/clients";
import { guarded, invalid, requireId } from "./helpers";

export async function createClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const client = await createClient(ctx, parsed.data);
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
