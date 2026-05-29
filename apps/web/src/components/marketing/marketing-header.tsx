import { Menu, Sparkles } from "lucide-react";
import { Button } from "@ash/ui/button";
import { isAshLocale } from "@ash/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { firstWorkbenchHref } from "@/lib/workbench-href";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";

const NAV_PATHS = [
  { href: "/product" as const, labelKey: "navProduct" as const },
  { href: "/showcase" as const, labelKey: "navShowcase" as const },
  { href: "/docs" as const, labelKey: "navDocs" as const },
  { href: "/pricing" as const, labelKey: "navPricing" as const },
];

/** Marketing site top bar — neutral Manus-inspired chrome */
export async function MarketingHeader() {
  const localeRaw = await getLocale();
  const ashLocale = isAshLocale(localeRaw) ? localeRaw : "zh";

  const t = await getTranslations({ locale: ashLocale, namespace: "Header" });
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  const workbenchHref = firstWorkbenchHref(tasks, projects);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground"
          aria-label={t("logoAria")}
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-card">
            <Sparkles className="size-4 text-foreground" aria-hidden />
          </span>
          ash
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV_PATHS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href={workbenchHref}>{t("workbench")}</Link>
          </Button>
          <Button variant="pill" size="sm" className="hidden sm:inline-flex shadow-sm" asChild>
            <Link href={workbenchHref}>{t("freeStart")}</Link>
          </Button>
          <details className="relative md:hidden">
            <summary
              className="flex cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-card p-2 [&::-webkit-details-marker]:hidden"
              aria-label={t("openMenuAria")}
            >
              <Menu className="size-5 text-foreground" />
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
              {NAV_PATHS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-accent"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
              <Link
                href={workbenchHref}
                className="mt-1 block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                {t("goWorkbench")}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
