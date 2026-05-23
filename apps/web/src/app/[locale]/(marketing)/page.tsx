import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Layers,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@ash/ui/button";
import { getMockConversations, isAshLocale, type AshLocale } from "@ash/shared";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ashLocale = isAshLocale(locale) ? locale : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Home" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function MarketingHomePage({ params }: Props) {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const conversations = getMockConversations(ashLocale);
  const first = conversations[0];
  const workbenchHref = first ? `/c/${first.id}` : "/c/conv-1";

  const t = await getTranslations({ locale: ashLocale, namespace: "Home" });

  return (
    <>
      <section className="border-b border-border bg-background px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            {t("heroKicker")}
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-balance text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {t("heroTitleLine1")}
            <br className="hidden sm:block" />
            {t("heroTitleLine2")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-center text-base leading-relaxed text-muted-foreground">
            {t("heroBody")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button variant="default" size="lg" className="px-8 shadow-sm" asChild>
              <Link href={workbenchHref}>
                {t("ctaStartFree")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="px-6 bg-card" asChild>
              <Link href="/product">{t("ctaProduct")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionTitle
            eyebrow={t("whyEyebrow")}
            title={t("whyTitle")}
            subtitle={t("whySubtitle")}
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <HighlightCard
              icon={<LayoutGrid className="size-5" aria-hidden />}
              title={t("highlight1Title")}
              body={t("highlight1Body")}
            />
            <HighlightCard
              icon={<Brain className="size-5" aria-hidden />}
              title={t("highlight2Title")}
              body={t("highlight2Body")}
            />
            <HighlightCard
              icon={<Layers className="size-5" aria-hidden />}
              title={t("highlight3Title")}
              body={t("highlight3Body")}
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <SectionTitle
                eyebrow={t("showcaseEyebrow")}
                title={t("showcaseTitle")}
                subtitle={t("showcaseSubtitle")}
              />
            </div>
            <Button variant="pill" size="sm" className="w-fit shrink-0 shadow-sm" asChild>
              <Link href="/showcase">
                {t("showcaseCta")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <TeaserTile title={t("teaser1Title")} tag={t("teaser1Tag")} copy={t("teaser1Copy")} teaserLinkLabel={t("teaserLink")} />
            <TeaserTile title={t("teaser2Title")} tag={t("teaser2Tag")} copy={t("teaser2Copy")} teaserLinkLabel={t("teaserLink")} />
            <TeaserTile title={t("teaser3Title")} tag={t("teaser3Tag")} copy={t("teaser3Copy")} teaserLinkLabel={t("teaserLink")} />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background p-8">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
              <BookOpen className="size-5 text-foreground" aria-hidden />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">{t("docsCardTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("docsCardBody")}</p>
            <ul className="mt-6 space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-muted-foreground" aria-hidden />
                {t("docsCardBullet1")}
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
                {t("docsCardBullet2")}
              </li>
              <li className="flex items-center gap-2">
                <Wrench className="size-4 text-muted-foreground" aria-hidden />
                {t("docsCardBullet3")}
              </li>
            </ul>
            <Button variant="pill" size="sm" className="mt-8 shadow-sm" asChild>
              <Link href="/docs">{t("docsCardCta")}</Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-background p-8">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card">
              <Sparkles className="size-5 text-foreground" aria-hidden />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">{t("pricingCardTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("pricingCardBody")}</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li>{t("pricingBullet1")}</li>
              <li>{t("pricingBullet2")}</li>
              <li>{t("pricingBullet3")}</li>
            </ul>
            <Button variant="outline" size="sm" className="mt-8 bg-card" asChild>
              <Link href="/pricing">{t("pricingCardCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{t("bottomTitle")}</h2>
          <p className="max-w-lg text-sm leading-relaxed text-primary-foreground/85">{t("bottomBody")}</p>
          <Button
            variant="pill"
            size="lg"
            className="border border-primary-foreground/25 bg-card text-foreground hover:bg-accent"
            asChild
          >
            <Link href={workbenchHref}>{t("bottomCta")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function HighlightCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-xs">
      <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground">{icon}</div>
      <h3 className="mt-5 text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function TeaserTile({
  title,
  tag,
  copy,
  teaserLinkLabel,
}: {
  title: string;
  tag: string;
  copy: string;
  teaserLinkLabel: string;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
      <span className="w-fit rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {tag}
      </span>
      <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{copy}</p>
      <span className="mt-6 text-[13px] font-medium text-foreground underline-offset-4 group-hover:underline">
        <Link href="/showcase" className="inline-flex items-center gap-1 hover:underline">
          {teaserLinkLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </span>
    </div>
  );
}
