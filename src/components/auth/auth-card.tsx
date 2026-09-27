import { LocaleSwitcher } from "@/components/app-shell/locale-switcher";
import { getI18n } from "@/i18n/server";

export async function AuthCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const { locale } = await getI18n();
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">ClientProfit</span>
          <LocaleSwitcher current={locale} compact />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </main>
  );
}
