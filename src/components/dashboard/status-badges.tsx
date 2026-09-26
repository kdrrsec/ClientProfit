import { Badge } from "@/components/ui/badge";
import type { MarginStatus } from "@/lib/profitability";
import type { ClientStatus } from "@/generated/prisma/enums";

const MARGIN: Record<MarginStatus, { label: string; variant: "positive" | "warning" | "critical" | "neutral" }> = {
  POSITIVE: { label: "Positive margin", variant: "positive" },
  LOW: { label: "Low margin", variant: "warning" },
  NEGATIVE: { label: "Negative margin", variant: "critical" },
  NO_REVENUE: { label: "No revenue", variant: "neutral" },
};

export function MarginStatusBadge({ status }: { status: MarginStatus }) {
  const m = MARGIN[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

const CLIENT_STATUS: Record<ClientStatus, string> = { LEAD: "Lead", ACTIVE: "Active", PAUSED: "Paused", CHURNED: "Churned" };

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge variant="outline">{CLIENT_STATUS[status]}</Badge>;
}
