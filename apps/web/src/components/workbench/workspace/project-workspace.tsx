import type { AshLocale, Project } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import { ArrowLeftRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ArtifactsCard } from "./artifacts-card";
import { MaterialsCard } from "./materials-card";
import { ProjectTasksCard } from "./project-tasks-card";
import { ProjectSettingsCard } from "./project-settings-card";

export interface ProjectWorkspaceProps {
  locale: AshLocale;
  project: Project;
}

export async function ProjectWorkspace({ locale, project }: ProjectWorkspaceProps) {
  const t = await getTranslations("Workbench");

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-[13px] font-semibold">{t("projectSpaceTitle")}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <MaterialsCard materials={project.materials} />
          <Separator />
          <ProjectTasksCard tasks={project.tasks} />
          <Separator />
          <ArtifactsCard locale={locale} artifacts={project.artifacts} />
          <Separator />
          <ProjectSettingsCard project={project} />
        </div>
      </ScrollArea>
    </aside>
  );
}
