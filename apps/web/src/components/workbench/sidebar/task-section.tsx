"use client";

import type { AshLocale, Task } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { StatusDot } from "@ash/ui/status-dot";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  taskStatusChipClass,
  taskStatusDotVariant,
  taskStatusIsLive,
  taskStatusLabelKey,
  taskStatusSortRank,
} from "@/lib/task-status";
import { taskHref } from "@/lib/workbench-href";

export interface TaskSectionProps {
  locale: AshLocale;
  tasks: Task[];
  activeTaskId?: string;
  onNewTask?: () => void;
}

export function TaskSection({
  locale,
  tasks,
  activeTaskId,
  onNewTask,
}: TaskSectionProps) {
  const t = useTranslations("Workbench");
  // Deterministic ordering: stable sort by status bucket, preserving the
  // server's LIFO order within each bucket so the list never looks shuffled
  // (PRIN-1). `sort` is stable in modern engines; copy first to avoid mutating
  // the prop array.
  const displayTasks = [...tasks]
    .sort((a, b) => taskStatusSortRank(a.status) - taskStatusSortRank(b.status))
    .slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-label font-medium uppercase tracking-wider text-muted-foreground">
          {t("tasksSection")}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={onNewTask}
              aria-label={t("newTask")}
            >
              <Plus className="size-3.5" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("newTask")}</TooltipContent>
        </Tooltip>
      </div>
      <ul role="list" className="flex flex-col gap-0.5 px-1">
        {displayTasks.map((task) => {
          const isActive = task.id === activeTaskId;
          const statusLabel = t(taskStatusLabelKey(task.status));
          const live = taskStatusIsLive(task.status);
          return (
            <li key={task.id}>
              <Link
                href={taskHref(task.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block min-h-12 rounded-xl px-3 py-2.5 transition-colors",
                  // Selected state is weight + a 2px accent rail, not a louder
                  // color, so it clearly outranks hover (PRIN-4).
                  isActive
                    ? "border-l-2 border-sidebar-rail bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <p
                  className={cn(
                    "truncate text-body-sm",
                    isActive ? "font-semibold" : "font-medium",
                  )}
                >
                  {task.title}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {live ? (
                    <>
                      <StatusDot
                        status={taskStatusDotVariant(task.status)}
                        label={statusLabel}
                      />
                      <span className="text-label text-status-running-foreground">
                        {statusLabel}
                      </span>
                    </>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-label font-medium",
                        taskStatusChipClass(task.status),
                      )}
                    >
                      {statusLabel}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
        {displayTasks.length === 0 && (
          <li className="px-3 py-4 text-center text-label text-muted-foreground">
            {t("emptyTasks")}
          </li>
        )}
      </ul>
      {displayTasks.length > 0 && (
        <div className="px-3 pb-1 pt-0.5">
          <Link
            href="/app/tasks"
            className="text-label text-muted-foreground hover:text-foreground"
          >
            {t("viewAllTasks")}
          </Link>
        </div>
      )}
    </div>
  );
}
