"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/forms/fields";
import { useI18n } from "@/i18n/client";
import { acceptInvitationAction } from "@/server/actions/team";

export function AcceptInviteForm({ token, organizationName }: { token: string; organizationName: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(acceptInvitationAction, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />
      <SubmitButton pendingLabel={t("invite.joining")}>{t("invite.join", { org: organizationName })}</SubmitButton>
    </form>
  );
}
