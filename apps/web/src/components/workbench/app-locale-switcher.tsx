"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { Globe, ChevronDown } from "lucide-react";
import { routing } from "@/i18n/routing";
import { setLocaleCookie } from "@/app/(workbench)/locale-actions";

/**
 * In-app language picker for the cookie-routed workbench zone.
 *
 * Unlike the marketing `LocaleSwitcher` (which navigates between `/[locale]/`
 * paths), the app zone has no locale in the URL: this writes the `ash_locale`
 * cookie via a server action, then refreshes so server components re-render in
 * the chosen language.
 */
export function AppLocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("LocaleSwitcher");
  const [isPending, startTransition] = useTransition();

  const labels: Record<string, string> = {
    zh: t("zh"),
    en: t("en"),
  };

  function handleChange(value: string) {
    if (value === locale) return;
    startTransition(async () => {
      await setLocaleCookie(value);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-label"
          aria-label={t("ariaLabel")}
          disabled={isPending}
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
