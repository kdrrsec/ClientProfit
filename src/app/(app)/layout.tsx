import { signOutAction } from "@/server/actions/auth";
import { MobileNav, Sidebar } from "@/components/app-shell/sidebar";
import { requireOrgContext, requireUser } from "@/server/auth/context";
import { getOrganization } from "@/server/repositories/organizations";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await requireOrgContext();
  const org = await getOrganization(ctx);

  return (
    <div className="flex min-h-svh">
      <div className="sticky top-0 hidden h-svh md:block">
        <Sidebar organizationName={org.name} userName={user.name} userEmail={user.email} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b bg-surface px-4 py-3 md:hidden">
          <span className="truncate text-sm font-semibold">ClientProfit · {org.name}</span>
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
