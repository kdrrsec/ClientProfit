import Link from "next/link";
import type { Route } from "next";
import { getI18n } from "@/i18n/server";

export async function ClientLink({ client }: { client: { id: string; companyName: string; archivedAt: Date | null } }) {
  const { t } = await getI18n();
  return (
    <Link href={`/clients/${client.id}` as Route} className="text-sm underline-offset-4 hover:underline">
      {client.companyName}
      {client.archivedAt && <span className="ml-1 text-xs text-muted-foreground">{t("clientLink.archived")}</span>}
    </Link>
  );
}
