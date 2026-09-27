import Link from "next/link";
import { cn } from "@/lib/utils";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages/en";

const TABS = [
  { href: "/settings" as const, label: "settings.tab.general" as MessageKey },
  { href: "/settings/team" as const, label: "settings.tab.team" as MessageKey },
];

export async function SettingsTabs({ active }: { active: "/settings" | "/settings/team" }) {
  const { t: tr } = await getI18n();
  return (
    <nav className="border-b" aria-label={tr("settings.tabs")}>
      <ul className="flex gap-1">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.href === active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground",
                t.href === active && "border-foreground font-medium text-foreground",
              )}
            >
              {tr(t.label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
