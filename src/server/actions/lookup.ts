"use server";

import { msg } from "@/i18n/translate";
import { normalizeDomain } from "@/lib/domain-lookup";
import { requireOrgContext } from "@/server/auth/context";
import { lookupDomain } from "@/server/lookup/domain";
import { getFinancialSettings } from "@/server/services/profitability";

export type DomainLookupResult =
  | {
      ok: true;
      domain: string;
      registrar: string | null;
      /** YYYY-MM-DD */
      registeredAt: string | null;
      renewalDate: string | null;
      siteName: string | null;
      registry: "found" | "notFound" | "unavailable";
    }
  | { ok: false; error: string };

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Looks up registry data and the site's name for a domain or URL typed into a form. */
export async function lookupDomainAction(input: string): Promise<DomainLookupResult> {
  const ctx = await requireOrgContext();
  const domain = typeof input === "string" && input.length <= 300 ? normalizeDomain(input) : null;
  if (!domain) return { ok: false, error: msg("err.domainFormat") };
  const { today } = await getFinancialSettings(ctx);
  const r = await lookupDomain(domain, today);
  return {
    ok: true,
    domain,
    registrar: r.registrar,
    registeredAt: iso(r.registeredAt),
    renewalDate: iso(r.renewalDate),
    siteName: r.siteName,
    registry: r.registry,
  };
}
