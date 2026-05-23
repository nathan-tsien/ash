import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function ConversationNotFound() {
  const t = await getTranslations("NotFoundWorkbench");
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
      <p className="text-sm font-medium text-foreground">{t("title")}</p>
      <Link
        href="/"
        className="text-sm text-primary underline underline-offset-4 hover:text-primary/90"
      >
        {t("linkHome")}
      </Link>
    </div>
  );
}
