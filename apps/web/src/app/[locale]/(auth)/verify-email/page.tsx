import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("verifyEmailTitle") };
}

export default async function VerifyEmailPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("verifyEmailTitle")}</h2>
      <VerifyEmailForm />
    </div>
  );
}
