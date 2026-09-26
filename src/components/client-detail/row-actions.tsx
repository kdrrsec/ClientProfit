import Link from "next/link";
import type { Route } from "next";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { buttonVariants } from "@/components/ui/button";

export function RowActions({
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
  what: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={editHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Edit
      </Link>
      <ConfirmButton
        action={deleteAction}
        fields={{ id, returnTo }}
        label="Delete"
        confirmLabel="Delete"
        message={`Delete this ${what}?`}
        variant="ghost"
      />
    </div>
  );
}
