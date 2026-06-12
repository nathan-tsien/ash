"use client";

import type { Task } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
      <ul className="space-y-1">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={taskHref(task.id)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  task.status === "completed"
                    ? "bg-status-success"
                    : task.status === "running"
                      ? "animate-pulse bg-status-running"
                      : task.status === "failed"
                        ? "bg-destructive"
                        : "border border-muted-foreground/40",
                )}
              />
              <span className="truncate">{task.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
