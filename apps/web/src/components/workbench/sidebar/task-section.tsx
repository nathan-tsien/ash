"use client";

import type { AshLocale, Task } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const displayTasks = tasks.slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("tasksSection")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onNewTask}
          aria-label={t("newTask")}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
      <ul role="list" className="flex flex-col gap-0.5 px-1">
        {displayTasks.map((task) => (
          <li key={task.id}>
            <Link
              href={taskHref(task.id)}
              className={cn(
                "block rounded-xl px-3 py-2.5 transition-colors",
                task.id === activeTaskId
                  ? "bg-sidebar-accent"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <p className="truncate text-[13px] font-medium leading-snug">
                {task.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    task.status === "running"
                      ? "animate-pulse bg-status-running"
                      : task.status === "completed"
                        ? "bg-status-success"
                        : task.status === "failed"
                          ? "bg-destructive"
                          : "bg-muted-foreground/40",
                  )}
                />
                <span className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(task.updatedAt, locale)}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {displayTasks.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">
            {t("emptyTasks")}
          </li>
        )}
      </ul>
    </div>
  );
}
