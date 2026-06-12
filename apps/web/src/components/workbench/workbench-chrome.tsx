"use client";

import { Button } from "@ash/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { PanelRightOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "@/lib/animations/gsap-setup";
import { fadeOut, fadeIn } from "@/lib/animations/presets";
import { PANE_WIDTH } from "@/lib/layout-constants";
import { SettingsModalProvider } from "@/components/settings/settings-modal-provider";
import { CommandPaletteProvider, useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { WorkbenchChat } from "./chat/workbench-chat";
import { WorkbenchSidebar } from "./sidebar/workbench-sidebar";
import type {
  WorkbenchShellProps,
  WorkspaceToggleProps,
} from "./workbench-types";

export interface WorkbenchChromeProps extends WorkbenchShellProps {
  workspacePanel: ReactNode;
}

function WorkbenchChromeInner({
  locale,
  conversations,
  active,
  chatBanner,
  workspacePanel,
}: WorkbenchChromeProps) {
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("Workbench");
  const { togglePalette } = useCommandPalette();

  const onToggle = useCallback(() => setWorkspaceCollapsed((v) => !v), []);
  const onExpand = useCallback(() => setWorkspaceCollapsed(false), []);

  const workspaceToggle = useMemo<WorkspaceToggleProps>(
    () => ({ collapsed: workspaceCollapsed, onToggle }),
    [workspaceCollapsed, onToggle],
  );

  // Global Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePalette]);

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
        tasks={[]}
        projects={[]}
        viewMode="home"
      />

      <WorkbenchChat
        locale={locale}
        active={active}
        workspace={workspaceToggle}
        banner={chatBanner}
      />

      <div
        ref={workspaceRef}
        className="flex shrink-0 flex-col"
        style={{ width: PANE_WIDTH.workspace }}
      >
        {workspacePanel}
      </div>

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

      <CommandPalette onToggleWorkspace={onToggle} />
    </div>
  );
}

export function WorkbenchChrome(props: WorkbenchChromeProps) {
  return (
    <SettingsModalProvider>
      <CommandPaletteProvider>
        <WorkbenchChromeInner {...props} />
      </CommandPaletteProvider>
    </SettingsModalProvider>
  );
}
