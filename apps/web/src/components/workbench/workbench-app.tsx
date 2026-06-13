"use client";

import type { WorkbenchAppProps } from "./workbench-types";
import { WorkbenchSidebar } from "./sidebar/workbench-sidebar";
import { WorkbenchChat } from "./chat/workbench-chat";
import { TaskWorkspace } from "./workspace/task-workspace";
import { ProjectWorkspace } from "./workspace/project-workspace";
import { WorkbenchHome } from "./workbench-home";
import { useAnswerTask, useTaskRun, useTaskRuns } from "./task-run-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { fadeOut, fadeIn } from "@/lib/animations/presets";
import { PANE_WIDTH } from "@/lib/layout-constants";
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
  taskId,
}: WorkbenchAppProps) {
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("Workbench");

  // Live runs created this session override / extend server-hydrated tasks.
  const sessionRuns = useTaskRuns();
  const answerTask = useAnswerTask();
  const resolvedTaskId = activeTask?.id ?? taskId;
  const liveTask = useTaskRun(resolvedTaskId) ?? activeTask;
  const mergedTasks = [
    ...sessionRuns,
    ...tasks.filter((task) => !sessionRuns.some((run) => run.id === task.id)),
  ];

  const onToggle = useCallback(() => setWorkspaceCollapsed((v) => !v), []);
  const onExpand = useCallback(() => setWorkspaceCollapsed(false), []);

  useGSAP(
    () => {
      const ws = workspaceRef.current;
      const fab = fabRef.current;
      if (!ws || !fab) return;

      if (workspaceCollapsed) {
        // Width collapses alongside the slide so chat reclaims the gutter (IA-2).
        const tl = gsap.timeline();
        tl.to(ws, { xPercent: 100, width: 0, ...fadeOut() })
          // fromTo, not from: the expand branch leaves the FAB at autoAlpha 0,
          // which .from() would capture as the end value (FAB stuck invisible)
          .fromTo(
            fab,
            { scale: 0.8, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.2, ease: "power2.out" },
            "<0.1",
          );
      } else {
        const tl = gsap.timeline();
        tl.to(fab, fadeOut(0.1))
          .to(ws, { xPercent: 0, width: PANE_WIDTH.workspace, ...fadeIn(0.35) }, "<0.05");
      }
    },
    { dependencies: [workspaceCollapsed] },
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <WorkbenchSidebar
        locale={locale}
        tasks={mergedTasks}
        projects={projects}
        activeTaskId={liveTask?.id}
        activeProjectId={activeProject?.id}
        viewMode={viewMode}
      />

      {viewMode === "home" ? (
        <WorkbenchHome locale={locale} tasks={mergedTasks} projects={projects} />
      ) : liveTask ? (
        <WorkbenchChat
          locale={locale}
          active={{
            id: liveTask.id,
            title: liveTask.title,
            preview: liveTask.description,
            updatedAt: liveTask.updatedAt,
            status: mapTaskStatus(liveTask.status),
            messages: liveTask.messages,
            plan: [],
            toolTraces: liveTask.toolTraces,
            artifacts: liveTask.artifacts,
          }}
          workspace={{ collapsed: workspaceCollapsed, onToggle }}
          pendingQuestion={liveTask.pendingQuestion}
          onAnswer={(text) => void answerTask(liveTask.id, text)}
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
      ) : (
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-background px-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t("runNotFoundTitle")}</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t("runNotFoundBody")}
          </p>
        </main>
      )}

      {viewMode !== "home" && (liveTask || activeProject) && (
        <div
          ref={workspaceRef}
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ width: PANE_WIDTH.workspace }}
        >
          {liveTask ? (
            <TaskWorkspace locale={locale} task={liveTask} />
          ) : activeProject ? (
            <ProjectWorkspace locale={locale} project={activeProject} />
          ) : null}
        </div>
      )}

      {viewMode !== "home" && (liveTask || activeProject) && (
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
        tasks={mergedTasks}
        projects={projects}
      />
    </div>
  );
}
