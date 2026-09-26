import type { Route } from "next";

export const CLIENT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "revenue", label: "Revenue" },
  { id: "costs", label: "Costs" },
  { id: "services", label: "Services" },
  { id: "domains", label: "Domains" },
  { id: "hosting", label: "Hosting" },
  { id: "time", label: "Time" },
  { id: "profitability", label: "Profitability" },
  { id: "notes", label: "Notes" },
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number]["id"];

export function isClientTab(v: unknown): v is ClientTab {
  return CLIENT_TABS.some((t) => t.id === v);
}

export function tabHref(clientId: string, tab: ClientTab, extra: Record<string, string> = {}): Route {
  const sp = new URLSearchParams(tab === "overview" ? extra : { tab, ...extra });
  const qs = sp.toString();
  return `/clients/${clientId}${qs ? `?${qs}` : ""}` as Route;
}
