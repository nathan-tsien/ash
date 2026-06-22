import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  // Locale resolves from the `ash_locale` cookie via the i18n request config.
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("registerTitle") };
}

export default async function RegisterPage() {
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 font-display text-lg font-semibold">{t("registerTitle")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("registerDescription")}</p>
      <RegisterForm />
    </div>
  );
}
