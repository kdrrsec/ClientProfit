import { CalendarClock, Clock, Globe, LayoutDashboard, LogOut, Receipt, Server, Settings, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/messages/en";
import { signOutAction } from "@/server/actions/auth";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLink } from "./nav-link";
import { OrgSwitcher } from "./org-switcher";

export const NAV: { href: `/${string}`; label: MessageKey; icon: typeof Users }[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "nav.clients", icon: Users },
  { href: "/profitability", label: "nav.profitability", icon: TrendingUp },
  { href: "/domains", label: "nav.domains", icon: Globe },
  { href: "/hosting", label: "nav.hosting", icon: Server },
  { href: "/costs", label: "nav.costs", icon: Receipt },
  { href: "/time", label: "nav.time", icon: Clock },
  { href: "/renewals", label: "nav.renewals", icon: CalendarClock },
  { href: "/settings", label: "nav.settings", icon: Settings },
];

export async function Sidebar({
  organizationName,
  organizationId,
  organizations,
  logoUrl,
  userName,
  userEmail,
}: {
  organizationName: string;
  organizationId: string;
  organizations: { id: string; name: string }[];
  logoUrl?: string | null;
  userName: string;
  userEmail: string;
}) {
  const { t, locale } = await getI18n();
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
        {organizations.length > 1 ? (
          <div className="mt-2">
            <OrgSwitcher organizations={organizations} activeId={organizationId} />
          </div>
        ) : (
          <div className="mt-1 truncate text-xs text-muted-foreground" title={organizationName}>{organizationName}</div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label={t("a11y.main")}>
        {NAV.map((item) => (
          <NavLink key={item.href} href={item.href as never}>
            <item.icon className="size-4" aria-hidden />
            {t(item.label)}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 border-t px-5 py-4">
        <div>
          <div className="truncate text-sm font-medium">{userName}</div>
          <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
        </div>
        <LocaleSwitcher current={locale} />
        <form action={signOutAction}>
          <button type="submit" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <LogOut className="size-3.5" aria-hidden /> {t("auth.signOut")}
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Compact horizontal navigation for small screens, where the sidebar is hidden. */
export async function MobileNav() {
  const { t } = await getI18n();
  return (
    <nav className="overflow-x-auto border-b bg-surface px-2 md:hidden" aria-label={t("a11y.main")}>
      <ul className="flex gap-1 py-1.5">
        {NAV.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href as never}>
              <item.icon className="size-4" aria-hidden />
              <span className="whitespace-nowrap">{t(item.label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
