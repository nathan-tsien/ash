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
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background">
                <Sparkles className="size-4" aria-hidden />
              </span>
              ash
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{t("tagline")}</p>
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
        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-8 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} ash. {t("copyright")}
          </span>
          <div className="flex gap-4">
            <span className="cursor-not-allowed">{t("privacy")}</span>
            <span className="cursor-not-allowed">{t("terms")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
