"use client";

import type { Task } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { StatusDot } from "@ash/ui/status-dot";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { taskStatusDotVariant, taskStatusLabelKey } from "@/lib/task-status";
import { taskHref } from "@/lib/workbench-href";

export interface ProjectTasksCardProps {
  tasks: Task[];
}

export function ProjectTasksCard({ tasks }: ProjectTasksCardProps) {
  const t = useTranslations("Workbench");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("projectTasksTitle")}</h3>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <Plus className="size-3.5" aria-hidden />
          {t("newTask")}
        </Button>
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyTasks")}</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={taskHref(task.id)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent"
              >
                <StatusDot
                  status={taskStatusDotVariant(task.status)}
                  label={t(taskStatusLabelKey(task.status))}
                />
                <span className="truncate">{task.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
