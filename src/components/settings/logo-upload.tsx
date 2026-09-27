"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { removeLogoAction, uploadLogoAction } from "@/server/actions/settings";

export function LogoUpload({ logoUrl, enabled, canEdit }: { logoUrl: string | null; enabled: boolean; canEdit: boolean }) {
  const [state, action] = useActionState(uploadLogoAction, undefined);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Logo</CardTitle>
          <CardDescription>PNG, JPEG or WebP, up to 512 KB. Shown in the sidebar.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Current logo" className="size-14 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
        <div className="flex-1 space-y-3">
          {!enabled ? (
            <p className="text-sm text-muted-foreground">
              Uploading is not set up yet: it needs a Vercel Blob store connected to this project. Until then you can paste an image URL in the Logo URL field below.
            </p>
          ) : canEdit ? (
            <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp"
                required
                aria-label="Logo file"
                className="text-sm file:mr-3 file:rounded-md file:border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
              />
              <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
            </form>
          ) : null}
          <FormError state={state} />
          {state?.saved && <p role="status" className="text-xs text-muted-foreground">Logo updated.</p>}
          {canEdit && logoUrl && (
            <form action={removeLogoAction}>
              <Button type="submit" variant="ghost" size="sm">Remove logo</Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
