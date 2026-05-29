import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Button } from "@ash/ui/button";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { firstWorkbenchHref } from "@/lib/workbench-href";
import { listTasks } from "@/server/tasks";
import { listProjects } from "@/server/projects";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Pricing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

type TierSlug = "Explorer" | "Team" | "Enterprise";

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  const workbenchHref = firstWorkbenchHref(tasks, projects);

  const t = await getTranslations({ locale: ashLocale, namespace: "Pricing" });

  const tiers: { slug: TierSlug; emphasized: boolean }[] = [
    { slug: "Explorer", emphasized: false },
    { slug: "Team", emphasized: true },
    { slug: "Enterprise", emphasized: false },
  ];

  return (
    <div className="border-b border-border bg-background px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">{t("kicker")}</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => {
            const prefix = `tier${tier.slug}` as const;
            const name = t(`${prefix}Name`);
            const price = t(`${prefix}Price`);
            const blurb = t(`${prefix}Blurb`);
            const features = [1, 2, 3, 4].map((i) => t(`${prefix}F${i}`));

            return (
              <div
                key={tier.slug}
                className={`flex flex-col rounded-2xl border p-8 transition-all duration-200 ${
                  tier.emphasized
                    ? "border-foreground/20 bg-foreground text-primary-foreground shadow-lg hover:scale-[1.02] hover:shadow-xl"
                    : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:shadow-sm"
                }`}
              >
                <h2 className="text-[13px] font-semibold uppercase tracking-wider opacity-90">{name}</h2>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{price}</p>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    tier.emphasized ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {blurb}
                </p>
                <Button
                  variant={tier.emphasized ? "pill" : "outline"}
                  size="sm"
                  className={`mt-8 shadow-sm ${tier.emphasized ? "border-primary-foreground/30 bg-background text-foreground hover:bg-muted" : "bg-background"}`}
                  asChild
                >
                  <Link href={workbenchHref}>{t("ctaTier")}</Link>
                </Button>
                <ul className="mt-8 flex flex-1 flex-col gap-3 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${tier.emphasized ? "text-primary-foreground" : "text-foreground"}`}
                        aria-hidden
                      />
                      <span className={tier.emphasized ? "text-primary-foreground/95" : "text-muted-foreground"}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-[13px] text-muted-foreground">{t("footnote")}</p>
      </div>
    </div>
  );
}
