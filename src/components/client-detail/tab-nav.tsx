import Link from "next/link";
import { cn } from "@/lib/utils";
import { CLIENT_TABS, tabHref, type ClientTab } from "./tabs";

export function TabNav({ clientId, active, counts }: { clientId: string; active: ClientTab; counts: Partial<Record<ClientTab, number>> }) {
  return (
    <nav className="-mx-4 overflow-x-auto border-b px-4 md:mx-0 md:px-0" aria-label="Client sections">
      <ul className="flex gap-1">
        {CLIENT_TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={tabHref(clientId, t.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground",
                  isActive && "border-foreground font-medium text-foreground",
                )}
              >
                {t.label}
                {counts[t.id] !== undefined && <span className="rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{counts[t.id]}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
