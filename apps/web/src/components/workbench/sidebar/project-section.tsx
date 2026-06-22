"use client";

import type { Project } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { Folder, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { projectHref } from "@/lib/workbench-href";

export interface ProjectSectionProps {
  projects: Project[];
  activeProjectId?: string;
  onNewProject?: () => void;
}

export function ProjectSection({
  projects,
  activeProjectId,
  onNewProject,
}: ProjectSectionProps) {
  const t = useTranslations("Workbench");
  // No truncation: the parent ScrollArea handles overflow so all projects are reachable via scroll.
  const displayProjects = projects;

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("projectsSection")}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={onNewProject}
              aria-label={t("newProject")}
            >
              <Plus className="size-3.5" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("newProject")}</TooltipContent>
        </Tooltip>
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
                  <p className="truncate text-body-sm font-medium">
                    {project.name}
                  </p>
                  <p className="mt-0.5 text-label font-normal text-muted-foreground">
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
