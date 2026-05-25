"use client";

import { Badge } from "@ash/ui/badge";
import { Input } from "@ash/ui/input";
import { Switch } from "@ash/ui/switch";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { SectionHeader } from "../section-header";

export function GeneralSection() {
  const t = useTranslations("Settings");

  return (
    <div>
      <SectionHeader
        heading={t("general.heading")}
        description={t("general.description")}
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("general.languageLabel")}</p>
          <LocaleSwitcher />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{t("general.timezoneLabel")}</p>
            <Badge variant="muted">{t("phase2Badge")}</Badge>
          </div>
          <Input
            disabled
            placeholder={t("general.timezonePlaceholder")}
            className="max-w-sm"
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{t("general.autoSummaryLabel")}</p>
              <Badge variant="muted">{t("phase2Badge")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("general.autoSummaryDescription")}
            </p>
          </div>
          <Switch disabled aria-label={t("general.autoSummaryLabel")} />
        </div>
      </div>
    </div>
  );
}
