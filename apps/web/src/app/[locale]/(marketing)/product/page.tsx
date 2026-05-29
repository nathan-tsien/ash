import type { Metadata } from "next";
import {
  BadgeCheck,
  Brain,
  LayoutGrid,
  MessagesSquare,
  Shield,
  Zap,
} from "lucide-react";
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
  const t = await getTranslations({ locale: ashLocale, namespace: "Product" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const tasks = await listTasks(ashLocale);
  const projects = await listProjects(ashLocale);
  const workbenchHref = firstWorkbenchHref(tasks, projects);

  const t = await getTranslations({ locale: ashLocale, namespace: "Product" });

  const pillarIcons = [
    <LayoutGrid key="layout" className="size-5" />,
    <Brain key="brain" className="size-5" />,
    <MessagesSquare key="messages" className="size-5" />,
    <Zap key="zap" className="size-5" />,
    <Shield key="shield" className="size-5" />,
    <BadgeCheck key="badge" className="size-5" />,
  ] as const;

  const pillarBodyKeys = ["pillar1", "pillar2", "pillar3", "pillar4", "pillar5", "pillar6"] as const;
  const pillars = pillarBodyKeys.map((prefix, idx) => ({
    icon: pillarIcons[idx]!,
    title: t(`${prefix}Title`),
    desc: t(`${prefix}Body`),
  }));

  return (
    <div className="border-b border-border bg-background px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">{t("kicker")}</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" variant="default" className="shadow-sm" asChild>
            <Link href={workbenchHref}>{t("ctaTry")}</Link>
          </Button>
          <Button size="lg" variant="outline" className="bg-card" asChild>
            <Link href="/pricing">{t("ctaPricing")}</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-foreground">
                {p.icon}
              </div>
              <h2 className="mt-5 text-[16px] font-semibold tracking-tight text-foreground">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
