"use client";

import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";

export function SkillsSection() {
  const t = useTranslations("Settings");

  return (
    <div>
      <SectionHeader
        heading={t("skills.heading")}
        description={t("skills.description")}
      />

      <p className="text-sm text-muted-foreground">{t("skills.phase2Hint")}</p>

      <div className="mt-6">
        <Button disabled className="gap-2">
          {t("skills.heading")}
          <Badge variant="muted">{t("phase2Badge")}</Badge>
        </Button>
      </div>
    </div>
  );
}
