"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/client";
import { removeLogoAction, uploadLogoAction } from "@/server/actions/settings";

export function LogoUpload({ logoUrl, enabled, canEdit }: { logoUrl: string | null; enabled: boolean; canEdit: boolean }) {
  const { t } = useI18n();
  const [state, action] = useActionState(uploadLogoAction, undefined);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("logo.title")}</CardTitle>
          <CardDescription>{t("logo.description")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={t("logo.current")} className="size-14 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xs text-muted-foreground">{t("common.none")}</span>
          )}
        </div>
        <div className="flex-1 space-y-3">
          {!enabled ? (
            <p className="text-sm text-muted-foreground">{t("logo.notConfigured")}</p>
          ) : canEdit ? (
            <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp"
                required
                aria-label={t("logo.file")}
                className="text-sm file:mr-3 file:rounded-md file:border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
              />
              <SubmitButton pendingLabel={t("logo.uploading")}>{t("logo.upload")}</SubmitButton>
            </form>
          ) : null}
          <FormError state={state} />
          {state?.saved && <p role="status" className="text-xs text-muted-foreground">{t("logo.updated")}</p>}
          {canEdit && logoUrl && (
            <form action={removeLogoAction}>
              <Button type="submit" variant="ghost" size="sm">{t("logo.remove")}</Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
