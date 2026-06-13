import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@ash/ui/button";
import { showcaseCaseMap, type AshLocale, type ShowcaseCaseId } from "@ash/shared";
import { isAshLocale } from "@ash/shared";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Showcase" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

const caseIds: ShowcaseCaseId[] = ["case1", "case2", "case3", "case4"];

export default async function ShowcasePage({ params }: Props) {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";

  const t = await getTranslations({ locale: ashLocale, namespace: "Showcase" });

  const cases = caseIds.map((id, idx) => ({
    id,
    conversationId: showcaseCaseMap[id].conversationId,
    industry: t(`case${idx + 1}Industry` as const),
    title: t(`case${idx + 1}Title` as const),
    points: [1, 2, 3].map((i) => t(`case${idx + 1}P${i}` as const)),
  }));

  return (
    <div className="border-b border-border bg-background px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-body-sm font-semibold uppercase tracking-wider text-ember">{t("kicker")}</p>
        <h1 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        <Button className="mt-8 shadow-sm" size="lg" variant="pill" asChild>
          <Link href={`/c/${showcaseCaseMap.case1.conversationId}?demo=case1`}>
            {t("cta")}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {cases.map((c) => (
            <article
              key={c.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-md"
            >
              <span className="w-fit rounded-full border border-border bg-muted px-2.5 py-0.5 text-label uppercase tracking-wide text-muted-foreground">
                {c.industry}
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{c.title}</h2>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                {c.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span className="select-none text-foreground">·</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-border pt-4">
                <Button variant="pill" size="sm" className="gap-1.5" asChild>
                  <Link href={`/c/${c.conversationId}?demo=${c.id}`}>
                    {t("openDemoCta")}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
