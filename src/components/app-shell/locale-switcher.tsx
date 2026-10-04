"use client";

import { Languages } from "lucide-react";
import { useState, useTransition } from "react";
import { isLocale, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { setLocaleAction } from "@/server/actions/locale";

/**
 * Saves the choice on the account (when signed in) and in a cookie, then re-renders.
 * The action is called directly rather than through a form submit: React resets a
 * form after its action runs, which would snap the select back to its initial value.
 */
export function LocaleSwitcher({ current, compact }: { current: Locale; compact?: boolean }) {
  const { t } = useI18n();
  const [value, setValue] = useState<Locale>(current);
  const [pending, startTransition] = useTransition();
  return (
    <form action={setLocaleAction} className="flex items-center gap-2">
      <Languages className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <select
        name="locale"
        value={value}
        disabled={pending}
        aria-label={t("locale.label")}
        onChange={(e) => {
          const next = e.currentTarget.value;
          if (!isLocale(next)) return;
          setValue(next);
          const data = new FormData();
          data.set("locale", next);
          startTransition(() => setLocaleAction(data));
        }}
        className={
          compact
            ? "bg-transparent text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none disabled:opacity-60"
            : "rounded-md border border-input bg-surface px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
        }
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-xs underline">OK</button>
      </noscript>
    </form>
  );
}
