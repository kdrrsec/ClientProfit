"use client";

import { Select } from "@/components/ui/select";
import { useI18n } from "@/i18n/client";
import { switchOrganizationAction } from "@/server/actions/team";

/** Shown only when the user belongs to more than one organization. */
export function OrgSwitcher({ organizations, activeId }: { organizations: { id: string; name: string }[]; activeId: string }) {
  const { t } = useI18n();
  return (
    <form action={switchOrganizationAction}>
      <Select
        name="organizationId"
        defaultValue={activeId}
        aria-label={t("org.switch")}
        className="h-8 text-xs"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      <noscript>
        <button type="submit" className="mt-1 text-xs underline">{t("org.switchButton")}</button>
      </noscript>
    </form>
  );
}
