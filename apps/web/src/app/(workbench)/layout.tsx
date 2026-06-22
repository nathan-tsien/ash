import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Geist_Mono, Noto_Sans_SC } from "next/font/google";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import Script from "next/script";
import { TooltipProvider } from "@ash/ui/tooltip";
import { ThemeProvider } from "@ash/ui/lib/theme-provider";
import { AuthProvider } from "@/context/auth-context";

import "../globals.css";

// Font payloads are duplicated per root layout (this and the (site) root) on
// purpose: Next.js multiple root layouts each own their html/body, so each must
// declare its own font CSS variables. Keep these in sync with (site)/[locale].
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* Display face (TYPE-6): kept for parity with the site root so shared chrome (Wordmark) renders identically. */
const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  // Locale resolves from the `ash_locale` cookie via the i18n request config.
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: {
      default: t("defaultTitle"),
      template: `%s · ${t("brand")}`,
    },
    description: t("defaultDescription"),
  };
}

/**
 * Workbench root layout for the non-prefixed app zone (`/app`, `/c`).
 *
 * Unlike the (site) root, there is no `[locale]` path segment here: the active
 * locale is read from the `ash_locale` cookie inside the i18n request config,
 * so this layout simply consumes the resolved locale via `getLocale()`.
 */
export default async function WorkbenchRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const htmlLang = locale === "zh" ? "zh-CN" : "en";

  return (
    <html
      lang={htmlLang}
      className={`${dmSans.variable} ${notoSansSc.variable} ${geistMono.variable} ${bricolageGrotesque.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="ash-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("ash-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <AuthProvider>{children}</AuthProvider>
            </NextIntlClientProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
