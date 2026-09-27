"use server";

import { revalidatePath } from "next/cache";
import { msg } from "@/i18n/translate";
import type { FormState } from "@/lib/validation/auth";
import { settingsSchema } from "@/lib/validation/settings";
import { requireOrgContext } from "@/server/auth/context";
import { del, put } from "@vercel/blob";
import { validateLogo } from "@/lib/uploads";
import { uploadsEnabled } from "@/server/uploads";
import { setOrganizationLogo, updateOrganizationSettings } from "@/server/repositories/organizations";
import { echo, failure, invalid } from "./helpers";

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  if (ctx.role === "MEMBER") return failure(msg("err.adminOnlySettings"), formData);

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  await updateOrganizationSettings(ctx, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, values: echo(formData) };
}

const isOwnBlob = (url: string | null) => Boolean(url && /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/logos\//.test(url));

export async function uploadLogoAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  if (ctx.role === "MEMBER") return { error: msg("err.adminOnlyLogo") };
  if (!uploadsEnabled()) return { error: msg("err.uploadsOff") };

  const file = formData.get("logo");
  if (!(file instanceof File)) return { error: msg("err.chooseImage") };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateLogo(bytes);
  if (!check.ok) return { error: check.error };

  const blob = await put(`logos/${ctx.organizationId}.${check.kind.ext}`, Buffer.from(bytes), {
    access: "public",
    contentType: check.kind.contentType,
    addRandomSuffix: true,
  });
  const previous = await setOrganizationLogo(ctx, blob.url);
  if (isOwnBlob(previous)) await del(previous!).catch(() => undefined);
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function removeLogoAction() {
  const ctx = await requireOrgContext();
  if (ctx.role === "MEMBER") return;
  const previous = await setOrganizationLogo(ctx, null);
  if (isOwnBlob(previous) && uploadsEnabled()) await del(previous!).catch(() => undefined);
  revalidatePath("/", "layout");
}
