import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("registerTitle") };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("registerTitle")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("registerDescription")}</p>
      <RegisterForm />
    </div>
  );
}
