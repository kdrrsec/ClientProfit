import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages/en";

export async function NoClientsYet({ what }: { what: MessageKey }) {
  const { t } = await getI18n();
  return (
    <div className="flex flex-col items-start gap-3 py-2 text-sm text-muted-foreground">
      <p>{t("noClients.text", { what: t(what) })}</p>
      <Link href="/clients/new" className={buttonVariants({ size: "sm" })}>
        {t("clients.add")}
      </Link>
    </div>
  );
}
