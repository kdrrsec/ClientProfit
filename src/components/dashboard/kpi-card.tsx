import { Card } from "@/components/ui/card";

export function KpiCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-xs text-muted-foreground tabular-nums">{detail}</div>}
    </Card>
  );
}
