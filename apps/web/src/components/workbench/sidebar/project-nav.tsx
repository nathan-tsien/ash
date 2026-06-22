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
import Link from "next/link";
import {
  taskStatusDotVariant,
  taskStatusLabelKey,
  taskStatusSortRank,
} from "@/lib/task-status";

export interface ProjectNavProps {
  locale: AshLocale;
  project: Project;
  activeTaskId?: string;
}

export function ProjectNav({ locale, project, activeTaskId }: ProjectNavProps) {
  const t = useTranslations("Workbench");
  // Same deterministic ordering as TaskSection so project-internal tasks read
  // consistently with the dual-section list (PRIN-1). Copy before sorting.
  const tasks = [...project.tasks].sort(
    (a, b) => taskStatusSortRank(a.status) - taskStatusSortRank(b.status),
  );

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
        <span className="text-label font-medium uppercase tracking-wider text-muted-foreground">
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
        {tasks.map((task) => {
          const isActive = task.id === activeTaskId;
          return (
            <li key={task.id}>
              <Link
                href={`/app/task/${task.id}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-xl px-3 py-2.5 transition-colors",
                  // Same active vocabulary as the dual-section task rows.
                  isActive
                    ? "border-l-2 border-sidebar-rail bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <div className="flex items-center gap-2">
                  <StatusDot
                    status={taskStatusDotVariant(task.status)}
                    label={t(taskStatusLabelKey(task.status))}
                  />
                  <p
                    className={cn(
                      "truncate text-body-sm",
                      isActive ? "font-semibold" : "font-medium",
                    )}
                  >
                    {task.title}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
