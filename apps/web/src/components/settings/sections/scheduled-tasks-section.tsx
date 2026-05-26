"use client";

import {
  formatRelativeTime,
  getMockScheduledTasks,
  isAshLocale,
  type ScheduledTaskStatus,
} from "@ash/shared";
import { Badge } from "@ash/ui/badge";
import { Button } from "@ash/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";

function statusBadgeVariant(
  status: ScheduledTaskStatus,
): "success" | "muted" | "destructive" {
  switch (status) {
    case "enabled":
      return "success";
    case "paused":
      return "muted";
    case "errored":
      return "destructive";
  }
}

function statusLabelKey(status: ScheduledTaskStatus): string {
  switch (status) {
    case "enabled":
      return "scheduledTasks.statusEnabled";
    case "paused":
      return "scheduledTasks.statusPaused";
    case "errored":
      return "scheduledTasks.statusErrored";
  }
}

export function ScheduledTasksSection() {
  const localeRaw = useLocale();
  const locale = isAshLocale(localeRaw) ? localeRaw : "zh";
  const t = useTranslations("Settings");
  const tasks = getMockScheduledTasks(locale);

  return (
    <div>
      <SectionHeader
        heading={t("scheduledTasks.heading")}
        description={t("scheduledTasks.description")}
      />

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("scheduledTasks.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{task.label}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {task.cron}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant(task.status)}>
                  {t(statusLabelKey(task.status))}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("scheduledTasks.nextRunLabel")}{" "}
                {formatRelativeTime(task.nextRunAt, locale)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {task.description}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Button disabled className="gap-2">
          {t("scheduledTasks.addAction")}
          <Badge variant="muted">{t("phase2Badge")}</Badge>
        </Button>
      </div>
    </div>
  );
}
