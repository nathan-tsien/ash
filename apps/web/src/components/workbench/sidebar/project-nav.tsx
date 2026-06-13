"use client";

import type { AshLocale, Project } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { StatusDot } from "@ash/ui/status-dot";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { ArrowLeft, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { taskStatusDotVariant, taskStatusLabelKey } from "@/lib/task-status";

export interface ProjectNavProps {
  locale: AshLocale;
  project: Project;
  activeTaskId?: string;
}

export function ProjectNav({ locale, project, activeTaskId }: ProjectNavProps) {
  const t = useTranslations("Workbench");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/app"
              className="flex size-8 items-center justify-center rounded-lg hover:bg-sidebar-accent"
              aria-label={t("backToHome")}
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent>{t("backToHome")}</TooltipContent>
        </Tooltip>
        <p className="truncate text-body-sm font-semibold">{project.name}</p>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("projectTasks")}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              aria-label={t("newTask")}
            >
              <Plus className="size-3.5" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("newTask")}</TooltipContent>
        </Tooltip>
      </div>

      <ul role="list" className="flex flex-col gap-0.5 px-1">
        {project.tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={`/app/task/${task.id}`}
              className={cn(
                "block rounded-xl px-3 py-2.5 transition-colors",
                task.id === activeTaskId
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <div className="flex items-center gap-2">
                <StatusDot
                  status={taskStatusDotVariant(task.status)}
                  label={t(taskStatusLabelKey(task.status))}
                />
                <p className="truncate text-body-sm font-medium">
                  {task.title}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
