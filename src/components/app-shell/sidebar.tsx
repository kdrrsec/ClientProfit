import { CalendarClock, Clock, Globe, LayoutDashboard, LogOut, Receipt, Server, Settings, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/server/actions/auth";
import { NavLink } from "./nav-link";

/** Only routes that exist are listed; sections are added as they are built. */
export const NAV = [
  { href: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients" as const, label: "Clients", icon: Users },
  { href: "/profitability" as const, label: "Profitability", icon: TrendingUp },
  { href: "/domains" as const, label: "Domains", icon: Globe },
  { href: "/hosting" as const, label: "Hosting", icon: Server },
  { href: "/costs" as const, label: "Other costs", icon: Receipt },
  { href: "/time" as const, label: "Time", icon: Clock },
  { href: "/renewals" as const, label: "Renewals", icon: CalendarClock },
  { href: "/settings" as const, label: "Settings", icon: Settings },
];

export function Sidebar({ organizationName, logoUrl, userName, userEmail }: { organizationName: string; logoUrl?: string | null; userName: string; userEmail: string }) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-surface">
      <div className="px-5 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          {logoUrl && (
            // User-provided external URL; next/image would require whitelisting every host.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-6 rounded object-contain" referrerPolicy="no-referrer" />
          )}
          ClientProfit
        </Link>
        <div className="mt-1 truncate text-xs text-muted-foreground" title={organizationName}>{organizationName}</div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
        {NAV.map((item) => (
          <NavLink key={item.href} href={item.href}>
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t px-5 py-4">
        <div className="truncate text-sm font-medium">{userName}</div>
        <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
        <form action={signOutAction} className="mt-3">
          <button type="submit" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <LogOut className="size-3.5" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Compact horizontal navigation for small screens, where the sidebar is hidden. */
export function MobileNav() {
  return (
    <nav className="overflow-x-auto border-b bg-surface px-2 md:hidden" aria-label="Main">
      <ul className="flex gap-1 py-1.5">
        {NAV.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href}>
              <item.icon className="size-4" aria-hidden />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
