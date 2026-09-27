"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/validation/auth";
import { settingsSchema } from "@/lib/validation/settings";
import { requireOrgContext } from "@/server/auth/context";
import { updateOrganizationSettings } from "@/server/repositories/organizations";
import { echo, failure, invalid } from "./helpers";

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireOrgContext();
  if (ctx.role === "MEMBER") return failure("Only owners and admins can change settings.", formData);

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  await updateOrganizationSettings(ctx, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true, values: echo(formData) };
}
