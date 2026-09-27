import type { Route } from "next";

export const CLIENT_TABS = [
  { id: "overview" },
  { id: "revenue" },
  { id: "costs" },
  { id: "services" },
  { id: "domains" },
  { id: "hosting" },
  { id: "time" },
  { id: "profitability" },
  { id: "notes" },
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
