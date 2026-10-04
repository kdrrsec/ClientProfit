/**
 * Pure helpers for looking up a domain: input normalisation, RDAP parsing
 * (RFC 9083) and picking a company name from a home page. No I/O here; the
 * fetching lives in src/server/lookup.
 */

const HOSTNAME = /^(?=.{4,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,63}$/;

/** "https://www.Bakkerij.nl/contact" → "bakkerij.nl". Null when it isn't a public hostname. */
export function normalizeDomain(input: string): string | null {
  let v = input.trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  v = v.split(/[/?#]/)[0] ?? "";
  v = v.replace(/:\d+$/, "").replace(/\.$/, "");
  if (v.includes("@")) return null;
  if (v.startsWith("www.")) v = v.slice(4);
  return HOSTNAME.test(v) ? v : null;
}

export interface RdapInfo {
  registrar: string | null;
  registeredAt: Date | null;
  expiresAt: Date | null;
}

type RdapEntity = { roles?: unknown; vcardArray?: unknown; entities?: unknown };

function vcardName(entity: RdapEntity): string | null {
  const card = Array.isArray(entity.vcardArray) ? entity.vcardArray[1] : null;
  if (!Array.isArray(card)) return null;
  for (const prop of card) {
    if (Array.isArray(prop) && prop[0] === "fn" && typeof prop[3] === "string" && prop[3].trim()) return prop[3].trim();
  }
  return null;
}

function findRegistrar(entities: unknown): string | null {
  if (!Array.isArray(entities)) return null;
  for (const e of entities as RdapEntity[]) {
    if (Array.isArray(e.roles) && e.roles.includes("registrar")) {
      const name = vcardName(e);
      if (name) return name;
    }
  }
  // Some registries nest the registrar under another entity.
  for (const e of entities as RdapEntity[]) {
    const nested = findRegistrar(e.entities);
    if (nested) return nested;
  }
  return null;
}

/** Calendar day in UTC, matching Postgres DATE columns. */
function toUtcDay(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function parseRdap(json: unknown): RdapInfo {
  const obj = (json && typeof json === "object" ? json : {}) as { events?: unknown; entities?: unknown };
  const events = Array.isArray(obj.events) ? (obj.events as { eventAction?: unknown; eventDate?: unknown }[]) : [];
  const eventDate = (action: string) => toUtcDay(events.find((e) => e.eventAction === action)?.eventDate);
  return {
    registrar: findRegistrar(obj.entities),
    registeredAt: eventDate("registration"),
    expiresAt: eventDate("expiration"),
  };
}

function addYearsUtc(d: Date, years: number): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear() + years, d.getUTCMonth(), d.getUTCDate()));
  // 29 Feb → 28 Feb in non-leap years instead of rolling over to March.
  if (r.getUTCMonth() !== d.getUTCMonth()) r.setUTCDate(0);
  return r;
}

/**
 * Next renewal on or after today. Uses the registry's expiry date when it has
 * one; registries that publish none (such as .nl) renew yearly on the
 * registration anniversary.
 */
export function nextRenewalDate(info: Pick<RdapInfo, "registeredAt" | "expiresAt">, today: Date): Date | null {
  if (info.expiresAt && info.expiresAt >= today) return info.expiresAt;
  const anchor = info.expiresAt ?? info.registeredAt;
  if (!anchor) return null;
  let next = anchor;
  for (let i = 1; next < today && i <= 200; i++) next = addYearsUtc(anchor, i);
  return next;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (m, code: string) => {
    const lower = code.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return ENTITIES[lower] ?? m;
  });
}

const GENERIC = /^(home|homepage|start|startpagina|welkom|welcome|index|hoofdpagina|voorpagina)$/i;

function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content?.trim()) return content;
  }
  return null;
}

/** Lowercase letters and digits only, accents removed: "Bäkkerij Jansen" → "bakkerijjansen". */
const squash = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** "Home - Bakkerij Jansen | Vers brood" → ["Bakkerij Jansen", "Vers brood"] */
function segments(text: string): string[] {
  return decodeEntities(text)
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+[|–—·•:/-]\s+/)
    .map((p) => p.trim())
    .filter((p) => p && !GENERIC.test(p));
}

/**
 * Best guess at the business name on a home page, from og:site_name and
 * <title> split on separators like " | " and " - ". A part that looks like the
 * domain name wins ("Hosting Provider | TransIP" on transip.nl → "TransIP");
 * otherwise og:site_name, then the first part of the title that isn't "Home".
 */
export function pickSiteName(html: string, domain?: string): string | null {
  const site = segments(metaContent(html, "og:site_name") ?? "");
  const title = segments(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const candidates = [...site, ...title];
  const label = domain ? squash(domain.split(".")[0] ?? "") : "";
  const matches = (c: string) => {
    const s = squash(c);
    return s.length >= 3 && label.length >= 3 && (s === label || s.includes(label) || label.includes(s));
  };
  const best = (label && candidates.find(matches)) || candidates[0];
  return best ? best.slice(0, 200) : null;
}
