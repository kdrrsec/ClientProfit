import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings" as const, label: "General" },
  { href: "/settings/team" as const, label: "Team" },
];

export function SettingsTabs({ active }: { active: "/settings" | "/settings/team" }) {
  return (
    <nav className="border-b" aria-label="Settings sections">
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
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
