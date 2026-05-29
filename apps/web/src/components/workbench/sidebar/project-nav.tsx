"use client";

import type { AshLocale, Project } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

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
        <Link
          href="/app"
          className="flex size-8 items-center justify-center rounded-lg hover:bg-sidebar-accent"
          aria-label={t("backToHome")}
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <p className="truncate text-[13px] font-semibold">{project.name}</p>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("projectTasks")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label={t("newTask")}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
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
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    task.status === "completed"
                      ? "bg-emerald-500"
                      : task.status === "running"
                        ? "animate-pulse bg-blue-500"
                        : task.status === "failed"
                          ? "bg-destructive"
                          : "bg-muted-foreground/40",
                  )}
                />
                <p className="truncate text-[13px] font-medium leading-snug">
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
