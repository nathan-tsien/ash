import type { AshLocale, Conversation } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { ArrowLeftRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { WorkbenchChrome } from "./workbench-chrome";
import type { WorkbenchShellProps } from "./workbench-types";
import { PlanCard } from "./workspace/plan-card";
import { ToolsCard } from "./workspace/tools-card";

/** Thin read-only workspace for the legacy /c/[id] conversation surface.
 *  Renders plan + tool traces only; synthesized artifacts removed per task-8. */
async function ConversationWorkspace({ locale, active }: { locale: AshLocale; active: Conversation }) {
  const t = await getTranslations("Workbench");
  return (
    <aside className="flex w-workspace shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-body-sm font-semibold">{t("workspaceTitle")}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <PlanCard steps={active.plan} />
          <ToolsCard traces={active.toolTraces} />
        </div>
      </ScrollArea>
    </aside>
  );
}

/** Main three-pane workbench chrome (Sidebar / Chat / Workspace). */
export function WorkbenchShell(props: WorkbenchShellProps) {
  return (
    <WorkbenchChrome
      key={props.active.id}
      locale={props.locale}
      conversations={props.conversations}
      active={props.active}
      chatBanner={props.chatBanner}
      workspacePanel={
        <ConversationWorkspace locale={props.locale} active={props.active} />
      }
    />
  );
}
