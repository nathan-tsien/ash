"use client";

import { Menu, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
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
          <details className="relative md:hidden">
            <summary
              className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-card p-2 [&::-webkit-details-marker]:hidden"
              aria-label={t("openMenuAria")}
            >
              <Menu className="size-5 text-foreground" />
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
              <div className="px-3 py-1.5 text-label font-semibold uppercase tracking-wider text-muted-foreground">
                {t("navFeatures")}
              </div>
              <Link href="/product" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("featurePpt")}
              </Link>
              <Link href="/product" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("featureDoc")}
              </Link>
              <div className="mt-1 px-3 py-1.5 text-label font-semibold uppercase tracking-wider text-muted-foreground">
                {t("navSolutions")}
              </div>
              <Link href="/showcase" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("solutionCreative")}
              </Link>
              <Link href="/showcase" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("solutionProduct")}
              </Link>
              <Link href="/showcase" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("solutionAnalyst")}
              </Link>
              <div className="mt-1 px-3 py-1.5 text-label font-semibold uppercase tracking-wider text-muted-foreground">
                {t("navResources")}
              </div>
              <Link href="/docs" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("resourceBlog")}
              </Link>
              <Link href="/showcase" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("resourceCases")}
              </Link>
              <Link href="/product" className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent">
                {t("resourceSecurity")}
              </Link>
              <Link href="/pricing" className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                {t("navPricing")}
              </Link>
              <Link
                href="/app"
                className="mt-1 block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {t("startExperience")}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
