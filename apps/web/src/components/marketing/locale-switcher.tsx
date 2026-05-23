"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@ash/ui/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Compact locale picker for prefixed routes (/zh/*, /en/*). */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("LocaleSwitcher");

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5"
      aria-label={t("ariaLabel")}
    >
      {routing.locales.map((lc) => {
        const active = lc === locale;
        return (
          <Link
            key={lc}
            href={pathname && pathname !== "" ? pathname : "/"}
            locale={lc}
            className={cn(
              "rounded-md px-2 py-1 text-[12px] font-medium transition-colors",
              active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {lc === "zh" ? t("zh") : t("en")}
          </Link>
        );
      })}
    </div>
  );
}
