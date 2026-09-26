"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TimelinePoint } from "@/server/services/dashboard";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y?.slice(2)}`;
}

export function RevenueChart({ data, currency }: { data: TimelinePoint[]; currency: string }) {
  const money = new Intl.NumberFormat("nl-NL", { style: "currency", currency, maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat("nl-NL", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 });

  return (
    <div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={(v: number) => compact.format(v)}
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--ring)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
              labelFormatter={(l) => monthLabel(String(l))}
              formatter={(v, name) => [money.format(Number(v)), name]}
            />
            <Legend
              iconType="plainline"
              itemSorter={(item) => (item.dataKey === "revenue" ? 0 : 1)}
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value: string) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>}
            />
            <Line type="linear" dataKey="revenue" name="Revenue" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            <Line type="linear" dataKey="costs" name="Costs (direct + labour)" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Show as table</summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 text-left font-medium">Month</th>
              <th className="py-1.5 text-right font-medium">Revenue</th>
              <th className="py-1.5 text-right font-medium">Costs</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-b last:border-0">
                <td className="py-1.5">{monthLabel(d.month)}</td>
                <td className="py-1.5 text-right tabular-nums">{money.format(d.revenue)}</td>
                <td className="py-1.5 text-right tabular-nums">{money.format(d.costs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
