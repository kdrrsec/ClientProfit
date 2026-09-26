import type { Route } from "next";

/** Builds a section URL, dropping empty params (and page=1). */
export function sectionHref(path: string, params: Record<string, string | number | undefined | null>): Route {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (k === "page" && Number(v) === 1)) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return (qs ? `${path}?${qs}` : path) as Route;
}
