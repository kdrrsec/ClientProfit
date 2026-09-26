import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function NoClientsYet({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-start gap-3 py-2 text-sm text-muted-foreground">
      <p>{what} always belong to a client. Add a client first.</p>
      <Link href="/clients/new" className={buttonVariants({ size: "sm" })}>
        Add client
      </Link>
    </div>
  );
}
