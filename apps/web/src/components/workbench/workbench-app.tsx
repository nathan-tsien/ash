"use client";

import type { WorkbenchAppProps } from "./workbench-types";
import { WorkbenchSidebar } from "./sidebar/workbench-sidebar";
import { WorkbenchChat } from "./chat/workbench-chat";
import { TaskWorkspace } from "./workspace/task-workspace";
import { ProjectWorkspace } from "./workspace/project-workspace";
import { WorkbenchHome } from "./workbench-home";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { fadeOut, fadeIn } from "@/lib/animations/presets";
import { PanelRightOpen } from "lucide-react";
import { Button } from "@ash/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ash/ui/tooltip";
import { useTranslations } from "next-intl";

function mapTaskStatus(status: string): "idle" | "running" | "completed" | "failed" {
  switch (status) {
    case "running": return "running";
    case "completed": return "completed";
    case "failed": return "failed";
    default: return "idle";
  }
}

export function WorkbenchApp({
  locale,
  tasks,
  projects,
  activeTask,
  activeProject,
  viewMode,
}: WorkbenchAppProps) {
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("Workbench");

  const onToggle = useCallback(() => setWorkspaceCollapsed((v) => !v), []);
  const onExpand = useCallback(() => setWorkspaceCollapsed(false), []);

  useGSAP(
    () => {
      const ws = workspaceRef.current;
      const fab = fabRef.current;
      if (!ws || !fab) return;

      if (workspaceCollapsed) {
        const tl = gsap.timeline();
        tl.to(ws, { xPercent: 100, ...fadeOut() })
          .from(fab, { scale: 0.8, autoAlpha: 0, duration: 0.2, ease: "power2.out" }, "<0.1");
      } else {
        const tl = gsap.timeline();
        tl.to(fab, fadeOut(0.1))
          .to(ws, { xPercent: 0, ...fadeIn(0.35) }, "<0.05");
      }
    },
    { dependencies: [workspaceCollapsed] },
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <WorkbenchSidebar
        locale={locale}
        tasks={tasks}
        projects={projects}
        activeTaskId={activeTask?.id}
        activeProjectId={activeProject?.id}
        viewMode={viewMode}
      />

      {viewMode === "home" ? (
        <WorkbenchHome locale={locale} tasks={tasks} projects={projects} />
      ) : activeTask ? (
        <WorkbenchChat
          locale={locale}
          active={{
            id: activeTask.id,
            title: activeTask.title,
            preview: activeTask.description,
            updatedAt: activeTask.updatedAt,
            status: mapTaskStatus(activeTask.status),
            messages: activeTask.messages,
            plan: [],
            toolTraces: activeTask.toolTraces,
            artifacts: activeTask.artifacts,
          }}
          workspace={{ collapsed: workspaceCollapsed, onToggle }}
        />
      ) : activeProject ? (
        <WorkbenchChat
          locale={locale}
          active={{
            id: activeProject.id,
            title: activeProject.name,
            preview: activeProject.description,
            updatedAt: activeProject.updatedAt,
            status: activeProject.status === "active" ? "running" : "idle",
            messages: [],
            plan: activeProject.tasks.map((task) => ({
              id: task.id,
              label: task.title,
              status: task.status === "completed" ? "done" as const : task.status === "running" ? "running" as const : task.status === "failed" ? "failed" as const : "pending" as const,
            })),
            toolTraces: [],
            artifacts: activeProject.artifacts,
          }}
          workspace={{ collapsed: workspaceCollapsed, onToggle }}
        />
      ) : null}

      {viewMode !== "home" && (
        <div
          ref={workspaceRef}
          className="flex shrink-0 flex-col"
          style={{ width: 380 }}
        >
          {activeTask ? (
            <TaskWorkspace locale={locale} task={activeTask} />
          ) : activeProject ? (
            <ProjectWorkspace locale={locale} project={activeProject} />
          ) : null}
        </div>
      )}

      {viewMode !== "home" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={fabRef}
              variant="pill"
              size="sm"
              className="fixed bottom-24 right-4 z-40 gap-2 shadow-md lg:bottom-8"
              type="button"
              aria-label={t("expandWorkbenchAria")}
              onClick={onExpand}
              style={{ visibility: workspaceCollapsed ? "visible" : "hidden" }}
            >
              <PanelRightOpen className="size-4" aria-hidden />
              {t("workspaceTitle")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{t("workspaceFabTooltip")}</TooltipContent>
        </Tooltip>
      )}

      <CommandPalette
        onToggleWorkspace={viewMode !== "home" ? onToggle : undefined}
        tasks={tasks}
        projects={projects}
      />
    </div>
  );
}
