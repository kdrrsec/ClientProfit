import { signOutAction } from "@/server/actions/auth";
import { MobileNav, Sidebar } from "@/components/app-shell/sidebar";
import { requireOrgContext, requireUser } from "@/server/auth/context";
import { getOrganization, listUserOrganizations } from "@/server/repositories/organizations";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await requireOrgContext();
  const [org, memberships] = await Promise.all([getOrganization(ctx), listUserOrganizations(user.id)]);
  const organizations = memberships.map((m) => m.organization);

  return (
    <div className="flex min-h-svh">
      <div className="sticky top-0 hidden h-svh md:block">
        <Sidebar organizationName={org.name} organizationId={org.id} organizations={organizations} logoUrl={org.logoUrl} userName={user.name} userEmail={user.email} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b bg-surface px-4 py-3 md:hidden">
          {organizations.length > 1 ? (
            <div className="w-48">
              <OrgSwitcher organizations={organizations} activeId={org.id} />
            </div>
          ) : (
            <span className="truncate text-sm font-semibold">ClientProfit · {org.name}</span>
          )}
          <form action={signOutAction}>
            <button type="submit" className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
          </form>
        </div>
        <MobileNav />
        {children}
      </div>
    </div>
  );
}
