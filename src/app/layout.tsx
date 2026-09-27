import type { Metadata } from "next";
import { I18nProvider } from "@/i18n/client";
import { getI18n, MESSAGES } from "@/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: "ClientProfit", template: "%s · ClientProfit" },
    description: t("meta.tagline"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} messages={MESSAGES[locale]}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
