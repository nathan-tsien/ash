"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { Globe, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Compact locale picker using a dropdown menu so new languages do not break the layout. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LocaleSwitcher");

  const labels: Record<string, string> = {
    zh: t("zh"),
    en: t("en"),
  };

  function handleChange(value: string) {
    router.push(pathname && pathname !== "" ? pathname : "/", {
      locale: value,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-[12px] font-medium"
          aria-label={t("ariaLabel")}
        >
          <Globe className="size-3.5" aria-hidden />
          <span>{labels[locale] ?? locale}</span>
          <ChevronDown className="size-3" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleChange}>
          {routing.locales.map((lc) => (
            <DropdownMenuRadioItem key={lc} value={lc}>
              {labels[lc] ?? lc}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
