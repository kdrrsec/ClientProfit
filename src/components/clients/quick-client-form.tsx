"use client";

import { Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useActionState, useRef, useState, useTransition } from "react";
import { FieldShell, FormError, FormGrid, MoneyField, SubmitButton, useFieldValues } from "@/components/forms/fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/lib/format";
import { quickCreateClientAction } from "@/server/actions/clients";
import { lookupDomainAction, type DomainLookupResult } from "@/server/actions/lookup";

type Found = Extract<DomainLookupResult, { ok: true }>;

/**
 * Quick add: type a website, we look up the registrar, dates and company
 * name; the user only confirms. Everything else can be added later.
 */
export function QuickClientForm({ currency, cancelHref }: { currency: string; cancelHref: Route }) {
  const { t, locale } = useI18n();
  const [state, action] = useActionState(quickCreateClientAction, undefined);
  const f = useFieldValues(state, { manageDomain: "on" });

  const [domain, setDomain] = useState(f.value("domain"));
  const [companyName, setCompanyName] = useState(f.value("companyName"));
  const [nameFromSite, setNameFromSite] = useState(false);
  const [manageDomain, setManageDomain] = useState(f.checked("manageDomain"));
  const [found, setFound] = useState<Found | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastLookup = useRef("");

  function lookup() {
    const value = domain.trim();
    if (!value || value === lastLookup.current) return;
    lastLookup.current = value;
    startTransition(async () => {
      const r = await lookupDomainAction(value);
      if (!r.ok) {
        setFound(null);
        setLookupError(r.error);
        return;
      }
      setLookupError(null);
      setFound(r);
      setDomain(r.domain);
      lastLookup.current = r.domain;
      // Only fill the name when the user hasn't typed one (or it was our own suggestion).
      if (r.siteName && (!companyName.trim() || nameFromSite)) {
        setCompanyName(r.siteName);
        setNameFromSite(true);
      }
    });
  }

  const domainErrors = lookupError ? [lookupError] : f.errors("domain");
  const date = (iso: string | null) => (iso ? formatDate(new Date(`${iso}T00:00:00Z`), locale) : "—");

  return (
    <form action={action} className="grid gap-6" noValidate>
      <FormError state={state} />

      <FieldShell name="domain" label={t("quick.domain")} hint={t("quick.domainHint")} errors={domainErrors}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="domain"
              name="domain"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                // Details from an earlier lookup belong to the old domain.
                if (found && e.target.value.trim() !== found.domain) setFound(null);
                setLookupError(null);
              }}
              onBlur={lookup}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup();
                }
              }}
              placeholder="bakkerijjansen.nl"
              autoComplete="url"
              inputMode="url"
              className="pl-9"
              aria-invalid={domainErrors ? true : undefined}
              aria-describedby={domainErrors ? "domain-error" : undefined}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !domain.trim()}
            onClick={() => {
              lastLookup.current = "";
              lookup();
            }}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {pending ? t("quick.lookingUp") : t("quick.lookup")}
          </Button>
        </div>
      </FieldShell>

      {found && (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm" role="status">
          {found.registry === "unavailable" ? (
            <p className="text-muted-foreground">{t("quick.registryBusy")}</p>
          ) : found.registry === "found" && (found.registrar || found.registeredAt) ? (
            <>
              <p className="mb-2 font-medium">{t("quick.found")}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
                <dt>{t("field.registrar")}</dt>
                <dd className="text-foreground">{found.registrar ?? "—"}</dd>
                <dt>{t("field.registeredAt")}</dt>
                <dd className="text-foreground tabular-nums">{date(found.registeredAt)}</dd>
                <dt>{t("field.nextRenewalDate")}</dt>
                <dd className="text-foreground tabular-nums">{date(found.renewalDate)}</dd>
              </dl>
            </>
          ) : (
            <p className="text-muted-foreground">{t("quick.notFound")}</p>
          )}
          <input type="hidden" name="registrar" value={found.registrar ?? ""} />
          <input type="hidden" name="registeredAt" value={found.registeredAt ?? ""} />
          <input type="hidden" name="renewalDate" value={found.renewalDate ?? ""} />
        </div>
      )}

      <FieldShell
        name="companyName"
        label={t("field.companyName")}
        hint={nameFromSite ? t("quick.nameFromSite") : undefined}
        errors={f.errors("companyName")}
      >
        <Input
          id="companyName"
          name="companyName"
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            setNameFromSite(false);
          }}
          required
          autoComplete="organization"
          aria-invalid={f.errors("companyName") ? true : undefined}
          aria-describedby={f.errors("companyName") ? "companyName-error" : undefined}
        />
      </FieldShell>

      {domain.trim() && (
        <div className="grid gap-4">
          <div className="flex items-start gap-2.5">
            <input
              id="manageDomain"
              name="manageDomain"
              type="checkbox"
              checked={manageDomain}
              onChange={(e) => setManageDomain(e.target.checked)}
              className="mt-0.5 size-4 rounded border-input accent-primary"
            />
            <div>
              <label htmlFor="manageDomain" className="text-sm font-medium">{t("quick.manageDomain")}</label>
              <p className="text-xs text-muted-foreground">{t("quick.manageDomainHint")}</p>
            </div>
          </div>
          {manageDomain && (
            <FormGrid>
              <MoneyField name="sellingPrice" label={t("field.sellingPricePerYear")} hint={t("quick.priceLater")} currency={currency} defaultValue={f.value("sellingPrice")} errors={f.errors("sellingPrice")} />
              <MoneyField name="renewalCost" label={t("field.renewalCostPerYear")} hint={t("quick.priceLater")} currency={currency} defaultValue={f.value("renewalCost")} errors={f.errors("renewalCost")} />
            </FormGrid>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{t("clientForm.create")}</SubmitButton>
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}
