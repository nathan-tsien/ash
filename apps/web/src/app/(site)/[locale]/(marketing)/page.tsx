import type { Metadata } from "next";
import { ArrowRight, LayoutGrid, MessageSquare, Wrench } from "lucide-react";
import { Button } from "@ash/ui/button";
import { isAshLocale, type AshLocale } from "@ash/shared";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
// Cross-zone link into the cookie-routed app zone: use the non-prefixing
// next/link so it renders bare `/app` (the locale-prefixing Link would emit
// `/zh/app`, which 404s since the app zone has no `[locale]` segment).
import NextLink from "next/link";
import { HeroTimeline } from "@/components/animations/hero-timeline";
import { StaggerGroup } from "@/components/animations/stagger-group";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { HoverScale } from "@/components/animations/hover-scale";
import { QuickStartDialog } from "@/components/marketing/quick-start-dialog";

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

  const t = await getTranslations({ locale: ashLocale, namespace: "Home" });

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative border-b border-border bg-background px-4 py-16 sm:px-6 sm:py-24">
        {/* Grain texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "128px 128px",
            animation: "grain 6s steps(6) infinite",
          }}
        />
        <HeroTimeline className="relative mx-auto max-w-6xl">
          <p
            data-anim="kicker"
            className="text-center text-body-sm font-medium uppercase tracking-widest text-ember"
          >
            {t("heroKicker")}
          </p>
          <h1
            data-anim="title"
            className="mx-auto mt-4 max-w-3xl text-balance text-center font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            <span className="split-line block">{t("heroTitleLine1")}</span>
            <span className="split-line block">{t("heroTitleLine2")}</span>
          </h1>
          <p
            data-anim="body"
            className="mx-auto mt-5 max-w-2xl text-pretty text-center text-base leading-relaxed text-muted-foreground"
          >
            {t("heroBody")}
          </p>
          <div data-anim="cta">
            <QuickStartDialog />
            <p className="mx-auto mt-3 text-center text-label text-muted-foreground/70">
              {t("quickStartHint")}
            </p>
          </div>
        </HeroTimeline>
      </section>

      {/* ── Product Interface Preview ── */}
      <section className="border-b border-border bg-card px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <p className="text-label font-semibold uppercase tracking-wider text-muted-foreground">
                {t("previewEyebrow")}
              </p>
              <h2 className="mx-auto mt-2 max-w-2xl text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("previewTitle")}
              </h2>
            </div>
          </ScrollReveal>
          <ScrollReveal className="mt-10">
            <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
              <div className="flex h-56 sm:h-72">
                {/* Sidebar */}
                <div className="flex w-[20%] flex-col gap-2 border-r border-border bg-muted/40 p-3">
                  <div className="h-2 w-8 rounded bg-border" />
                  <div className="mt-2 space-y-1.5">
                    <div className="h-2 w-full rounded bg-border/70" />
                    <div className="h-2 w-3/4 rounded bg-border/70" />
                    <div className="h-2 w-full rounded bg-border/70" />
                    <div className="h-2 w-1/2 rounded bg-border/70" />
                  </div>
                </div>
                {/* Chat */}
                <div className="flex flex-1 flex-col gap-2 bg-background p-3">
                  <div className="ml-auto h-5 w-2/3 rounded-md bg-primary/10" />
                  <div className="h-8 w-3/4 rounded-md bg-muted" />
                  <div className="ml-auto h-5 w-1/2 rounded-md bg-primary/10" />
                  <div className="mt-auto h-6 w-full rounded-md border border-border bg-card" />
                </div>
                {/* Workspace */}
                <div className="flex w-[24%] flex-col border-l border-border bg-muted/30 p-3">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-6 rounded bg-border" />
                    <div className="h-2 w-6 rounded bg-border" />
                    <div className="h-2 w-6 rounded bg-border" />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2 w-full rounded bg-border/70" />
                    <div className="h-2 w-3/4 rounded bg-border/70" />
                    <div className="h-2 w-5/6 rounded bg-border/70" />
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal stagger={0.1} className="mx-auto mt-8 flex max-w-2xl justify-center gap-8 sm:gap-12">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LayoutGrid className="size-4" aria-hidden />
              {t("previewLabel1")}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="size-4" aria-hidden />
              {t("previewLabel2")}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wrench className="size-4" aria-hidden />
              {t("previewLabel3")}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="border-b border-border bg-background px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <ScrollReveal className="max-w-xl">
              <SectionTitle
                eyebrow={t("showcaseEyebrow")}
                title={t("showcaseTitle")}
                subtitle={t("showcaseSubtitle")}
              />
            </ScrollReveal>
            <ScrollReveal>
              <Button variant="pill" size="sm" className="w-fit shrink-0 shadow-sm" asChild>
                <Link href="/showcase">
                  {t("showcaseCta")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </ScrollReveal>
          </div>
          <StaggerGroup className="mt-10 grid gap-6 md:grid-cols-3">
            <TeaserTile title={t("teaser1Title")} tag={t("teaser1Tag")} copy={t("teaser1Copy")} teaserLinkLabel={t("teaserLink")} />
            <TeaserTile title={t("teaser2Title")} tag={t("teaser2Tag")} copy={t("teaser2Copy")} teaserLinkLabel={t("teaserLink")} />
            <TeaserTile title={t("teaser3Title")} tag={t("teaser3Tag")} copy={t("teaser3Copy")} teaserLinkLabel={t("teaserLink")} />
          </StaggerGroup>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6 sm:py-20">
        <ScrollReveal>
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
            <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t("bottomTitle")}</h2>
            <p className="max-w-lg text-sm leading-relaxed text-primary-foreground/85">{t("bottomBody")}</p>
            <Button
              variant="pill"
              size="lg"
              className="border border-primary-foreground/25 bg-card text-foreground hover:bg-accent"
              asChild
            >
              <NextLink href="/app">{t("bottomCta")}</NextLink>
            </Button>
          </div>
        </ScrollReveal>
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
      <p className="text-label font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
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
    <HoverScale className="group flex flex-col rounded-2xl border border-border bg-card p-6">
      {/* Tag badge is Latin-only (Research/Growth/Soon untranslated product nouns), so caption (11px) is legal; switch to label (12px) per the TYPE-2 CJK floor if these ever localize */}
      <span className="w-fit rounded-full border border-border bg-muted px-2.5 py-0.5 text-caption font-medium uppercase tracking-wide text-muted-foreground">
        {tag}
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{copy}</p>
      <span className="mt-6 text-body-sm font-medium text-foreground underline-offset-4 group-hover:underline">
        <Link href="/showcase" className="inline-flex items-center gap-1 hover:underline">
          {teaserLinkLabel}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </span>
    </HoverScale>
  );
}
