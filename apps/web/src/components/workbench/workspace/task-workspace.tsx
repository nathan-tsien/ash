"use client";

import type { AshLocale, Task } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ArtifactsCard } from "./artifacts-card";
import { ToolsCard } from "./tools-card";

export interface TaskWorkspaceProps {
  locale: AshLocale;
  task: Task;
}

export function TaskWorkspace({ locale, task }: TaskWorkspaceProps) {
  const t = useTranslations("Workbench");

  return (
    <aside className="flex w-workspace shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-body-sm font-semibold">{t("workspaceTitle")}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <ArtifactsCard locale={locale} artifacts={task.artifacts} />
          <Separator />
          <ToolsCard traces={task.toolTraces} />
        </div>
      </ScrollArea>
    </aside>
  );
}
