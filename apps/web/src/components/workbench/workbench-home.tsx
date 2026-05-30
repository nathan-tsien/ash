"use client";

import type { AshLocale, Task, Project } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { taskHref, projectHref } from "@/lib/workbench-href";
import { formatRelativeTime } from "@ash/shared";

export interface WorkbenchHomeProps {
  locale: AshLocale;
  tasks: Task[];
  projects: Project[];
}

export function WorkbenchHome({ locale, tasks, projects }: WorkbenchHomeProps) {
  const t = useTranslations("Workbench");
  const recentTasks = tasks.slice(0, 6);
  const recentProjects = projects.slice(0, 4);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-16">
          {/* Central input area */}
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
              <Sparkles className="size-7 text-muted-foreground" aria-hidden />
            </div>
            <h1 className="text-xl font-semibold">{t("homeTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("homeSubtitle")}</p>
          </div>

          {/* Recent Tasks */}
          {recentTasks.length > 0 && (
            <section className="w-full">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("recentTasks")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={taskHref(task.id)}
                    className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatRelativeTime(task.updatedAt, locale)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {recentProjects.length > 0 && (
            <section className="w-full">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("projects")}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={projectHref(project.id)}
                    className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.tasks.length} {t("tasksCount")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state when no tasks and no projects */}
          {recentTasks.length === 0 && recentProjects.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">{t("homeEmptyTitle")}</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{t("homeEmptyBody")}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
