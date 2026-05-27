import { Sparkles } from "lucide-react";
import { isAshLocale } from "@ash/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function MarketingFooter() {
  const localeRaw = await getLocale();
  const ashLocale = isAshLocale(localeRaw) ? localeRaw : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Footer" });
  const tHeader = await getTranslations({ locale: ashLocale, namespace: "Header" });

  return (
    <footer className="relative bg-card">
      {/* Gradient accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 text-[15px] font-semibold text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background">
                <Sparkles className="size-4" aria-hidden />
              </span>
              ash
            </Link>
            {/* Mini workbench illustration */}
            <div className="mt-4 flex w-fit gap-1 rounded-md border border-border/60 bg-background p-1">
              <div className="w-5 rounded-sm bg-muted/80" />
              <div className="w-8 rounded-sm bg-border/50" />
              <div className="w-6 rounded-sm bg-muted/50" />
            </div>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{t("tagline")}</p>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("columnProduct")}
            </h3>
            <ul className="mt-4 flex flex-col gap-2">
              <li key="/product">
                <Link href="/product" className="text-sm text-foreground underline-offset-4 hover:underline">
                  {t("linkFeatures")}
                </Link>
              </li>
              <li key="/showcase">
                <Link href="/showcase" className="text-sm text-foreground underline-offset-4 hover:underline">
                  {tHeader("navShowcase")}
                </Link>
              </li>
              <li key="/pricing">
                <Link href="/pricing" className="text-sm text-foreground underline-offset-4 hover:underline">
                  {tHeader("navPricing")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("columnResources")}
            </h3>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                <Link href="/docs" className="text-sm text-foreground underline-offset-4 hover:underline">
                  {t("docsHub")}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground underline-offset-4 hover:underline"
                >
                  {t("ghPlaceholder")}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-8 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-[11px] tracking-tight">
            &copy; {new Date().getFullYear()} ash &middot; {t("copyright")}
          </span>
          <div className="flex gap-4 font-mono text-[11px] tracking-tight">
            <span className="cursor-not-allowed opacity-50">{t("privacy")}</span>
            <span className="cursor-not-allowed opacity-50">{t("terms")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
