import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export async function generateMetadata(): Promise<Metadata> {
  // Locale resolves from the `ash_locale` cookie via the i18n request config.
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("verifyEmailTitle") };
}

export default async function VerifyEmailPage() {
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 font-display text-lg font-semibold">{t("verifyEmailTitle")}</h2>
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
