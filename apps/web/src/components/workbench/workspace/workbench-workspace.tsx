import type { AshLocale, Conversation } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import { ArrowLeftRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ArtifactsCard } from "./artifacts-card";
import { PlanCard } from "./plan-card";
import { ToolsCard } from "./tools-card";

export interface WorkbenchWorkspaceProps {
  locale: AshLocale;
  active: Conversation;
}

export async function WorkbenchWorkspace({ locale, active }: WorkbenchWorkspaceProps) {
  const t = await getTranslations("Workbench");

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-[13px] font-semibold">{t("workspaceTitle")}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <PlanCard steps={active.plan} />
          <Separator />
          <ToolsCard traces={active.toolTraces} />
          <Separator />
          <ArtifactsCard locale={locale} artifacts={active.artifacts} />
        </div>
      </ScrollArea>
    </aside>
  );
}
