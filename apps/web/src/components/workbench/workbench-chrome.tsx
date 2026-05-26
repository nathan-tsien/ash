"use client";

import { Button } from "@ash/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { PanelRightOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { SettingsModalProvider } from "@/components/settings/settings-modal-provider";
import { WorkbenchChat } from "./chat/workbench-chat";
import { WorkbenchSidebar } from "./sidebar/workbench-sidebar";
import type {
  WorkbenchShellProps,
  WorkspaceToggleProps,
} from "./workbench-types";

export interface WorkbenchChromeProps extends WorkbenchShellProps {
  workspacePanel: ReactNode;
}

/** Smallest "use client" boundary; owns workspace collapse state only. */
export function WorkbenchChrome({
  locale,
  conversations,
  active,
  chatBanner,
  workspacePanel,
}: WorkbenchChromeProps) {
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const t = useTranslations("Workbench");

  const onToggle = useCallback(() => setWorkspaceCollapsed((v) => !v), []);
  const onExpand = useCallback(() => setWorkspaceCollapsed(false), []);

  const workspaceToggle = useMemo<WorkspaceToggleProps>(
    () => ({ collapsed: workspaceCollapsed, onToggle }),
    [workspaceCollapsed, onToggle],
  );

  return (
    <SettingsModalProvider>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        <WorkbenchSidebar
          locale={locale}
          conversations={conversations}
          activeId={active.id}
        />

        <WorkbenchChat
          locale={locale}
          active={active}
          workspace={workspaceToggle}
          banner={chatBanner}
        />

        {!workspaceCollapsed && workspacePanel}

        {workspaceCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="pill"
                size="sm"
                className="fixed bottom-24 right-4 z-40 gap-2 shadow-md lg:bottom-8"
                type="button"
                aria-label={t("expandWorkbenchAria")}
                onClick={onExpand}
              >
                <PanelRightOpen className="size-4" aria-hidden />
                {t("workspaceTitle")}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{t("workspaceFabTooltip")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </SettingsModalProvider>
  );
}
