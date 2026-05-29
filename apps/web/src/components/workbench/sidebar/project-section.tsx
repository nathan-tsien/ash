"use client";

import type { AshLocale, Project } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Folder, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { projectHref } from "@/lib/workbench-href";

export interface ProjectSectionProps {
  locale: AshLocale;
  projects: Project[];
  activeProjectId?: string;
  onNewProject?: () => void;
}

export function ProjectSection({
  locale,
  projects,
  activeProjectId,
  onNewProject,
}: ProjectSectionProps) {
  const t = useTranslations("Workbench");
  const displayProjects = projects.slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("projectsSection")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onNewProject}
          aria-label={t("newProject")}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>
      <ul role="list" className="flex flex-col gap-0.5 px-1">
        {displayProjects.map((project) => {
          const completedTasks = project.tasks.filter(
            (t) => t.status === "completed",
          ).length;
          const runningTasks = project.tasks.filter(
            (t) => t.status === "running",
          ).length;
          return (
            <li key={project.id}>
              <Link
                href={projectHref(project.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                  project.id === activeProjectId
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <Folder
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-snug">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {runningTasks > 0 && `${runningTasks} ${t("running")} · `}
                    {completedTasks} {t("completed")}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
        {displayProjects.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-muted-foreground">
            {t("emptyProjects")}
          </li>
        )}
      </ul>
    </div>
  );
}
