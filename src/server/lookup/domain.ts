import "server-only";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { nextRenewalDate, parseRdap, pickSiteName } from "@/lib/domain-lookup";

/**
 * Online lookups for a domain someone is adding: registry data over RDAP (the
 * successor of WHOIS) and the business name from the site's home page. Both
 * are best effort: they fill in suggestions the user can still change.
 */

export interface DomainLookup {
  domain: string;
  registrar: string | null;
  registeredAt: Date | null;
  renewalDate: Date | null;
  siteName: string | null;
  /** False when the registry had no record (or couldn't be reached). */
  registryFound: boolean;
}

const RDAP_TIMEOUT_MS = 5000;
const SITE_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 300 * 1024;
const USER_AGENT = "ClientProfit/1.0 (domain lookup)";

// ─── RDAP ────────────────────────────────────────────────────────────────────

let bootstrap: { at: number; services: [string[], string[]][] } | null = null;

/** IANA's list of RDAP servers per TLD, cached for a day. */
async function rdapBaseUrl(domain: string): Promise<string> {
  const fallback = "https://rdap.org/";
  try {
    if (!bootstrap || Date.now() - bootstrap.at > 24 * 60 * 60 * 1000) {
      const res = await fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(RDAP_TIMEOUT_MS) });
      if (!res.ok) return fallback;
      const json = (await res.json()) as { services?: [string[], string[]][] };
      bootstrap = { at: Date.now(), services: json.services ?? [] };
    }
    const labels = domain.split(".");
    for (let i = 1; i < labels.length; i++) {
      const suffix = labels.slice(i).join(".");
      const hit = bootstrap.services.find(([tlds]) => tlds.includes(suffix));
      const url = hit?.[1].find((u) => u.startsWith("https://")) ?? hit?.[1][0];
      if (url) return url.endsWith("/") ? url : `${url}/`;
    }
  } catch {
    // Fall through to the public redirector.
  }
  return fallback;
}

async function rdapLookup(domain: string) {
  const base = await rdapBaseUrl(domain);
  const res = await fetch(`${base}domain/${encodeURIComponent(domain)}`, {
    headers: { accept: "application/rdap+json, application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(RDAP_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return parseRdap(await res.json());
}

// ─── Home page ───────────────────────────────────────────────────────────────

/** True for addresses on the public internet; blocks loopback, private, link-local, CGNAT and multicast ranges. */
export function isPublicIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a = 0, b = 0, c = 0] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && c === 100) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPublicIp(mapped[1]);
    if (v === "::" || v === "::1") return false;
    if (/^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff") || v.startsWith("2001:db8")) return false;
    return true;
  }
  return false;
}

/**
 * DNS lookup used for the actual connection, so the address is checked at
 * connect time (a check before fetching could be bypassed by DNS rebinding).
 */
export const publicOnlyLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    if (addresses.length === 0 || addresses.some((a) => !isPublicIp(a.address))) {
      return callback(Object.assign(new Error("Address not allowed"), { code: "EBLOCKED" }), "", 4);
    }
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, addresses);
    const first = addresses[0]!;
    callback(null, first.address, first.family);
  });
};

function getHtml(url: URL, redirectsLeft: number, deadline: number): Promise<string | null> {
  if (url.protocol !== "https:" && url.protocol !== "http:") return Promise.resolve(null);
  if (url.port && url.port !== "80" && url.port !== "443") return Promise.resolve(null);
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve) => {
    const req = client.get(
      url,
      {
        lookup: publicOnlyLookup,
        timeout: Math.max(1, deadline - Date.now()),
        headers: { "user-agent": USER_AGENT, accept: "text/html", "accept-language": "nl,en;q=0.8" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          let next: URL;
          try {
            next = new URL(res.headers.location, url);
          } catch {
            return resolve(null);
          }
          return resolve(getHtml(next, redirectsLeft - 1, deadline));
        }
        if (status !== 200 || !/html/i.test(String(res.headers["content-type"] ?? ""))) {
          res.resume();
          return resolve(null);
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          chunks.push(chunk);
          // The name sits in <head>; stop once it's past or the page is too big.
          if (size > MAX_HTML_BYTES || chunk.includes("</head>")) res.destroy();
        });
        const done = () => resolve(Buffer.concat(chunks).toString("utf8"));
        res.on("end", done);
        res.on("close", done);
        res.on("error", () => resolve(null));
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
  });
}

async function siteName(domain: string): Promise<string | null> {
  const deadline = Date.now() + SITE_TIMEOUT_MS;
  const html = (await getHtml(new URL(`https://${domain}/`), 4, deadline)) ?? (await getHtml(new URL(`https://www.${domain}/`), 4, deadline));
  return html ? pickSiteName(html) : null;
}

// ─── Combined ────────────────────────────────────────────────────────────────

/** `domain` must already be normalised (see normalizeDomain). Never throws. */
export async function lookupDomain(domain: string, today: Date): Promise<DomainLookup> {
  const [rdap, name] = await Promise.all([rdapLookup(domain).catch(() => null), siteName(domain).catch(() => null)]);
  return {
    domain,
    registrar: rdap?.registrar ?? null,
    registeredAt: rdap?.registeredAt ?? null,
    renewalDate: rdap ? nextRenewalDate(rdap, today) : null,
    siteName: name,
    registryFound: rdap !== null,
  };
}
