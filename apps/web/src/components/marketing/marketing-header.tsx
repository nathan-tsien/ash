"use client";

import { Menu, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ash/ui/tooltip";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";

export function MarketingHeader() {
  const t = useTranslations("Header");

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-body-lg font-semibold tracking-tight text-foreground"
          aria-label={t("logoAria")}
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-card">
            <Sparkles className="size-4 text-foreground" aria-hidden />
          </span>
          ash
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {/* Features */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {t("navFeatures")}
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[10rem]">
              <DropdownMenuItem asChild>
                <Link href="/product" className="cursor-pointer">
                  {t("featurePpt")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/product" className="cursor-pointer">
                  {t("featureDoc")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Solutions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {t("navSolutions")}
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[10rem]">
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("solutionCreative")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("solutionProduct")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("solutionAnalyst")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Resources */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {t("navResources")}
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[10rem]">
              <DropdownMenuItem asChild>
                <Link href="/docs" className="cursor-pointer">
                  {t("resourceBlog")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("resourceCases")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/product" className="cursor-pointer">
                  {t("resourceSecurity")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Pricing — no dropdown */}
          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {t("navPricing")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <Button variant="pill" size="sm" className="hidden sm:inline-flex shadow-sm" asChild>
            <Link href="/app">{t("startExperience")}</Link>
          </Button>
          {/* Mobile menu — Radix DropdownMenu per UX-4 (native disclosure elements are forbidden for interactive menus) */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground transition-colors hover:bg-accent md:hidden"
                    aria-label={t("openMenuAria")}
                  >
                    <Menu className="size-5" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("openMenuAria")}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-label font-semibold uppercase tracking-wider text-muted-foreground">
                {t("navFeatures")}
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/product" className="cursor-pointer">
                  {t("featurePpt")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/product" className="cursor-pointer">
                  {t("featureDoc")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-label font-semibold uppercase tracking-wider text-muted-foreground">
                {t("navSolutions")}
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("solutionCreative")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("solutionProduct")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("solutionAnalyst")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-label font-semibold uppercase tracking-wider text-muted-foreground">
                {t("navResources")}
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/docs" className="cursor-pointer">
                  {t("resourceBlog")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/showcase" className="cursor-pointer">
                  {t("resourceCases")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/product" className="cursor-pointer">
                  {t("resourceSecurity")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/pricing" className="cursor-pointer font-medium">
                  {t("navPricing")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app" className="cursor-pointer font-medium">
                  {t("startExperience")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
