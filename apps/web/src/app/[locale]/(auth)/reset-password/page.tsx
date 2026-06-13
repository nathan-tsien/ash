import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("resetPasswordTitle") };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 font-display text-lg font-semibold">{t("resetPasswordTitle")}</h2>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
