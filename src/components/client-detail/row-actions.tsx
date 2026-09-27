import Link from "next/link";
import type { Route } from "next";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages/en";

export async function RowActions({
  editHref,
  deleteAction,
  id,
  returnTo,
  what,
}: {
  editHref: Route;
  deleteAction: (formData: FormData) => Promise<void>;
  id: string;
  returnTo: string;
  what: MessageKey;
}) {
  const { t } = await getI18n();
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={editHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        {t("common.edit")}
      </Link>
      <ConfirmButton
        action={deleteAction}
        fields={{ id, returnTo }}
        label={t("common.delete")}
        confirmLabel={t("common.delete")}
        message={t("rowActions.deleteConfirm", { what: t(what) })}
        variant="ghost"
      />
    </div>
  );
}
