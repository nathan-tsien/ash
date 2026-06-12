import { Sparkles } from "lucide-react";
import { Wordmark } from "@ash/ui/wordmark";
import { isAshLocale } from "@ash/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function MarketingFooter() {
  const localeRaw = await getLocale();
  const ashLocale = isAshLocale(localeRaw) ? localeRaw : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Footer" });

  return (
    <footer className="relative bg-card">
      {/* Gradient accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3 text-body-lg font-semibold text-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <Wordmark className="font-display" />
            </Link>
            {/* Mini workbench illustration */}
            <div className="mt-4 flex w-fit gap-1 rounded-md border border-border/60 bg-background p-1">
              <div className="w-5 rounded-sm bg-muted/80" />
              <div className="w-8 rounded-sm bg-border/50" />
              <div className="w-6 rounded-sm bg-muted/50" />
            </div>
            <p className="mt-4 max-w-sm text-body-sm leading-relaxed text-muted-foreground">{t("tagline")}</p>
          </div>
          <div>
            <h3 className="text-label font-semibold uppercase tracking-wider text-muted-foreground">
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
                  {t("linkShowcase")}
                </Link>
              </li>
              <li key="/pricing">
                <Link href="/pricing" className="text-sm text-foreground underline-offset-4 hover:underline">
                  {t("linkPricing")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-label font-semibold uppercase tracking-wider text-muted-foreground">
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
        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-8 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          {/* Copyright line is Latin/numeric only, so caption (11px) is legal; privacy/terms render Han glyphs and take label (12px) per the TYPE-2 CJK floor */}
          <span className="font-mono text-caption tracking-tight">
            &copy; {new Date().getFullYear()} ash &middot; {t("copyright")}
          </span>
          <div className="flex gap-4 font-mono text-label tracking-tight">
            <span className="cursor-not-allowed opacity-50">{t("privacy")}</span>
            <span className="cursor-not-allowed opacity-50">{t("terms")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
