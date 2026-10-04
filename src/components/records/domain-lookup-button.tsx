"use client";

import { Loader2, Search } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { lookupDomainAction } from "@/server/actions/lookup";

/** Fills registrar and dates in the surrounding domain form from the registry (RDAP). */
export function DomainLookupButton() {
  const { t, tm } = useI18n();
  const ref = useRef<HTMLButtonElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    const form = ref.current?.form;
    const input = form?.elements.namedItem("domain");
    if (!form || !(input instanceof HTMLInputElement) || !input.value.trim()) return;
    startTransition(async () => {
      const r = await lookupDomainAction(input.value);
      if (!r.ok) return setMessage(tm(r.error));
      input.value = r.domain;
      const set = (name: string, value: string | null) => {
        const el = form.elements.namedItem(name);
        if (value && el instanceof HTMLInputElement) el.value = value;
      };
      set("registrar", r.registrar);
      set("registeredAt", r.registeredAt);
      set("renewalDate", r.renewalDate);
      setMessage(
        r.registry === "unavailable"
          ? t("domainForm.lookupBusy")
          : r.registry === "found" && (r.registrar || r.registeredAt)
            ? t("domainForm.lookupDone")
            : t("domainForm.lookupNone"),
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button ref={ref} type="button" variant="outline" size="sm" onClick={run} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
        {t("domainForm.lookup")}
      </Button>
      {message && (
        <span role="status" className="text-xs text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
}
