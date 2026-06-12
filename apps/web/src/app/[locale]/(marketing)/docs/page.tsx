import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, Boxes, Palette, Puzzle } from "lucide-react";
import { Button } from "@ash/ui/button";
import type { AshLocale } from "@ash/shared";
import { isAshLocale } from "@ash/shared";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Docs" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function DocsHubPage({ params }: Props) {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Docs" });

  type Section = {
    title: string;
    icon: LucideIcon;
    keys: readonly string[];
  };

  const sections: Section[] = [
    {
      title: t("secGettingStarted"),
      icon: Puzzle,
      keys: ["itemReadmeEnv", "itemSpecPhase1", "itemRoadmap"],
    },
    {
      title: t("secArchitecture"),
      icon: Boxes,
      keys: ["itemArchitecture", "itemAdrs", "itemVisualLang"],
    },
    {
      title: t("secWorkbenchContracts"),
      icon: Palette,
      keys: ["itemWorkbenchShell", "itemPackages"],
    },
  ];

  return (
    <div className="border-b border-border bg-background px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-body-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("kicker")}</p>
            <h1 id="spec" className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("intro")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="pill" className="shadow-sm" asChild>
                <a href="https://github.com/" target="_blank" rel="noopener noreferrer">
                  {t("ghCta")}
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="bg-card" asChild>
                <Link href="/pricing">{t("pricingCta")}</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 lg:max-w-sm">
            <div className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
              <BookOpen className="size-4 text-muted-foreground" aria-hidden />
              {t("sideTitle")}
            </div>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>{t("sideL1")}</li>
              <li>{t("sideL2")}</li>
              <li>{t("sideL3")}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-body-lg font-semibold text-foreground">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {section.title}
                </div>
                <ul className="mt-4 flex flex-col gap-2">
                  {section.keys.map((itemKey) => (
                    <li key={itemKey}>
                      <span className="text-sm text-muted-foreground">{t(itemKey)}</span>
                      {itemKey !== "itemSpecPhase1" ? (
                        <span className="ml-2 text-label uppercase tracking-wide text-muted-foreground/70">
                          {t("inRepoBadge")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
