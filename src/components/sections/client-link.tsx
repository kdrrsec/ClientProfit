import Link from "next/link";
import type { Route } from "next";

export function ClientLink({ client }: { client: { id: string; companyName: string; archivedAt: Date | null } }) {
  return (
    <Link href={`/clients/${client.id}` as Route} className="text-sm underline-offset-4 hover:underline">
      {client.companyName}
      {client.archivedAt && <span className="ml-1 text-xs text-muted-foreground">(archived)</span>}
    </Link>
  );
}
