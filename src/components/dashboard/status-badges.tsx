import { Badge } from "@/components/ui/badge";
import { getI18n } from "@/i18n/server";
import type { MarginStatus } from "@/lib/profitability";
import type { ClientStatus } from "@/generated/prisma/enums";

const MARGIN_VARIANT: Record<MarginStatus, "positive" | "warning" | "critical" | "neutral"> = {
  POSITIVE: "positive",
  LOW: "warning",
  NEGATIVE: "critical",
  NO_REVENUE: "neutral",
};

export async function MarginStatusBadge({ status }: { status: MarginStatus }) {
  const { t } = await getI18n();
  return <Badge variant={MARGIN_VARIANT[status]}>{t(`marginStatus.${status}`)}</Badge>;
}

export async function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { t } = await getI18n();
  return <Badge variant="outline">{t(`clientStatus.${status}`)}</Badge>;
}
