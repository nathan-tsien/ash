"use client";

import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";

export function ScheduledTasksSection() {
  const t = useTranslations("Settings");

  return (
    <div>
      <SectionHeader
        heading={t("scheduledTasks.heading")}
        description={t("scheduledTasks.description")}
      />

      <p className="text-sm text-muted-foreground">{t("scheduledTasks.empty")}</p>

      <div className="mt-6">
        <Button disabled className="gap-2">
          {t("scheduledTasks.addAction")}
          <Badge variant="muted">{t("phase2Badge")}</Badge>
        </Button>
      </div>
    </div>
  );
}
