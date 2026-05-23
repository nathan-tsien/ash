import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@ash/ui/button";
import type { AshLocale } from "@ash/shared";
import { isAshLocale } from "@ash/shared";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Settings" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const ashLocale: AshLocale = isAshLocale(locale) ? locale : "zh";
  const t = await getTranslations({ locale: ashLocale, namespace: "Settings" });

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-6 px-6 py-12">
      <Button variant="ghost" size="sm" className="w-fit gap-2 px-2" asChild>
        <Link href="/">
          <ArrowLeft className="size-4" aria-hidden />
          {t("backHome")}
        </Link>
      </Button>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("body")}</p>
      </div>
    </div>
  );
}
