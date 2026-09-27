import { Search } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getI18n } from "@/i18n/server";

export interface FilterSelect {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}

/** Plain GET form: filters live in the URL and work without JavaScript. */
export async function FilterBar({
  action,
  search,
  placeholder,
  selects = [],
  dates = [],
  active,
}: {
  action: Route;
  search?: string;
  placeholder: string;
  selects?: FilterSelect[];
  dates?: { name: string; label: string; value?: string }[];
  active: boolean;
}) {
  const { t } = await getI18n();
  return (
    <form action={action} role="search" className="flex flex-col flex-wrap gap-2 sm:flex-row">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input name="q" defaultValue={search} placeholder={placeholder} aria-label={t("a11y.search")} className="pl-9" />
      </div>
      {selects.map((s) => (
        <div key={s.name} className="sm:w-44">
          <Select name={s.name} defaultValue={s.value ?? ""} aria-label={s.label}>
            <option value="">{s.label}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      ))}
      {dates.map((d) => (
        <label key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground sm:w-auto">
          {d.label}
          <Input type="date" name={d.name} defaultValue={d.value} className="sm:w-40" />
        </label>
      ))}
      <Button type="submit" variant="outline">
        {t("common.filter")}
      </Button>
      {active && (
        <Link href={action} className={buttonVariants({ variant: "ghost" })}>
          {t("common.reset")}
        </Link>
      )}
    </form>
  );
}
