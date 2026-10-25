import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { LanguageProvider } from "./_components/language-provider";

import "./globals.css";
import "./i18n.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: "Rialo Arena",
    description: t("The competitive Rialo knowledge challenge: 15 questions, 20 seconds each, and up to 3,000 points."),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, dictionary, direction } = await getI18n();
  return (
    <html lang={locale} dir={direction}>
      <body>
        <LanguageProvider locale={locale} dictionary={dictionary}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
