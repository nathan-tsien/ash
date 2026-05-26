import type { AshLocale, ShowcaseCaseId } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { Badge } from "@ash/ui/badge";
import { X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface DemoBannerProps {
  caseId: ShowcaseCaseId;
  locale: AshLocale;
  conversationId: string;
}

export async function DemoBanner({ caseId, locale, conversationId }: DemoBannerProps) {
  const t = await getTranslations({ locale, namespace: "ShowcaseReplay" });
  const titleKey = `${caseId}Title` as const;
  const bodyKey = `${caseId}Body` as const;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="muted" className="uppercase tracking-wide">
            {t("bannerLabel")}
          </Badge>
          <p className="truncate text-sm font-medium text-foreground">{t(titleKey)}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t(bodyKey)}</p>
      </div>
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <Link href={`/c/${conversationId}`}>
          <X className="size-3.5" aria-hidden />
          {t("exitCta")}
        </Link>
      </Button>
    </div>
  );
}
