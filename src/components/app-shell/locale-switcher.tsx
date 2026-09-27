"use client";

import { Languages } from "lucide-react";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { setLocaleAction } from "@/server/actions/locale";

/** Saves the choice on the account (when signed in) and in a cookie, then re-renders. */
export function LocaleSwitcher({ current, compact }: { current: Locale; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <form action={setLocaleAction} className="flex items-center gap-2">
      <Languages className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <select
        name="locale"
        defaultValue={current}
        aria-label={t("locale.label")}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={
          compact
            ? "bg-transparent text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none"
            : "rounded-md border border-input bg-surface px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
