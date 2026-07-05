"use client";

import type { AshLocale, Task, Project } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { Input } from "@ash/ui/input";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { LogoMark } from "@ash/ui/logo-mark";
import { Wordmark } from "@ash/ui/wordmark";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { fadeOut, fadeIn } from "@/lib/animations/presets";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import Link from "next/link";
import { PANE_WIDTH } from "@/lib/layout-constants";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkbenchViewMode } from "../workbench-types";
import { FooterAccount } from "./footer-account";
import { TaskSection } from "./task-section";
import { ProjectSection } from "./project-section";
import { ProjectNav } from "./project-nav";

export interface WorkbenchSidebarProps {
  locale: AshLocale;
  tasks: Task[];
  projects: Project[];
  activeTaskId?: string;
  activeProjectId?: string;
  viewMode: WorkbenchViewMode;
}

export function WorkbenchSidebar({
  locale,
  tasks,
  projects,
  activeTaskId,
  activeProjectId,
  viewMode,
}: WorkbenchSidebarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const asideRef = useRef<HTMLElement>(null);
  const expandedContentRef = useRef<HTMLDivElement>(null);
  const collapsedRailRef = useRef<HTMLDivElement>(null);
  const expandRailRef = useRef<HTMLButtonElement>(null);
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  // Tracks the most recent user-driven toggle so focus restoration ignores the initial mount.
  const lastToggleRef = useRef<"none" | "collapse" | "expand">("none");
  const t = useTranslations("Workbench");
  const { openSettings } = useSettingsModal();
  const { openPalette } = useCommandPalette();

  // Filter tasks and projects by sidebar search query.
  const filteredTasks = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => task.title.toLowerCase().includes(q));
  }, [tasks, sidebarQuery]);

  const filteredProjects = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(q),
    );
  }, [projects, sidebarQuery]);

  // The active project when in project view mode.
  const activeProject = viewMode === "project"
    ? projects.find((p) => p.id === activeProjectId)
    : undefined;

  // Return focus to whichever toggle button is mounted after a state flip,
  // so keyboard users never drop into <body>.
  useEffect(() => {
    if (lastToggleRef.current === "collapse") {
      expandRailRef.current?.focus();
    } else if (lastToggleRef.current === "expand") {
      collapseButtonRef.current?.focus();
    }
  }, [sidebarCollapsed]);

  // Animate sidebar collapse/expand with GSAP instead of CSS transitions.
  useGSAP(
    () => {
      const aside = asideRef.current;
      const expanded = expandedContentRef.current;
      const collapsed = collapsedRailRef.current;
      if (!aside || !expanded || !collapsed) return;

      if (sidebarCollapsed) {
        const tl = gsap.timeline();
        tl.to(expanded, fadeOut())
          .to(aside, { width: PANE_WIDTH.rail, duration: 0.25, ease: "power3.out" }, "<0.05")
          .to(collapsed, fadeIn(0.15), "<0.1");
      } else {
        const tl = gsap.timeline();
        tl.to(collapsed, fadeOut(0.1))
          .to(aside, { width: PANE_WIDTH.sidebar, duration: 0.35, ease: "power2.out" }, "<0.05")
          .to(expanded, fadeIn(), "<0.1");
      }
    },
    { dependencies: [sidebarCollapsed], scope: asideRef },
  );

  const sidebarListId = "workbench-sidebar-items";

  const collapseSidebar = () => {
    lastToggleRef.current = "collapse";
    setSidebarCollapsed(true);
  };
  const expandSidebar = () => {
    lastToggleRef.current = "expand";
    setSidebarCollapsed(false);
  };

  return (
    <aside
      ref={asideRef}
      className="relative flex w-sidebar shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
    >
      {/* Header: logo + brand + collapse, aligned on one row */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-accent"
              aria-label={t("sidebarHomeAria")}
            >
              <LogoMark className="size-[22px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("tooltipHomeChrome")}</TooltipContent>
        </Tooltip>
        <div className="min-w-0 flex-1 text-left">
          {/* Brand mark, not copy (COLOR-10): intentionally untranslated */}
          <p className="truncate text-body-sm font-semibold">
            <Wordmark />
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={collapseButtonRef}
              variant="ghost"
              size="icon"
              type="button"
              className="size-9 shrink-0"
              aria-label={t("collapseAria")}
              aria-expanded={true}
              aria-controls={sidebarListId}
              onClick={collapseSidebar}
            >
              <ChevronLeft className="size-[18px]" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("collapseSidebarTooltip")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Expanded content: search, task/project sections, footer */}
      <div ref={expandedContentRef} className="flex flex-1 flex-col">

        <div className="space-y-2 px-3 py-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center gap-2"
            asChild
          >
            <Link href="/app">
              <Plus className="size-4" aria-hidden />
              {t("newTask")}
            </Link>
          </Button>
          {/* One search row, two affordances: typing filters the inventory
              locally; the trailing kbd opens the global command palette. Folding
              the palette trigger in here drops a full-width control from the
              stack without losing discoverability (PRIN-2). */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded-xl pl-8 pr-12 text-sm"
              placeholder={t("searchPlaceholder")}
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              aria-label={t("searchAria")}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("commandPaletteAria")}
                  onClick={openPalette}
                >
                  {t("cmdK")}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("commandPaletteTooltip")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <Separator />
        <nav
          aria-label={t("sidebarItemsAria")}
          id={sidebarListId}
          className="flex min-h-0 flex-1 flex-col"
        >
          {viewMode === "project" && activeProject ? (
            // Project-nav view: single scroll covers the whole region.
            <ScrollArea className="min-h-0 flex-1">
              <ProjectNav
                locale={locale}
                project={activeProject}
                activeTaskId={activeTaskId}
              />
            </ScrollArea>
          ) : (
            <>
              {/* Tasks region — grows to fill available space and scrolls independently. */}
              <ScrollArea className="min-h-0 flex-1">
                <div className="py-2 pr-2">
                  <TaskSection
                    tasks={filteredTasks}
                    activeTaskId={activeTaskId}
                  />
                </div>
              </ScrollArea>
              <Separator />
              {/* Projects region — capped height so it stays visible even with many tasks. */}
              <ScrollArea className="max-h-[38%] shrink-0">
                <div className="py-2 pr-2">
                  <ProjectSection
                    projects={filteredProjects}
                    activeProjectId={activeProjectId}
                  />
                </div>
              </ScrollArea>
              {filteredTasks.length === 0 && filteredProjects.length === 0 && (
                <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {t("emptySearch")}
                </p>
              )}
            </>
          )}
        </nav>
        <div className="mt-auto">
          <FooterAccount />
        </div>
      </div>

      {/* Collapsed rail: icon buttons for quick actions */}
      <div
        ref={collapsedRailRef}
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-3"
        style={{ opacity: 0, visibility: "hidden" }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 rounded-xl active:bg-sidebar-accent" asChild>
              <Link href="/app" aria-label={t("newTask")}>
                <Plus className="size-[18px]" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("newTask")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-xl active:bg-sidebar-accent"
              onClick={() => openSettings("general")}
              aria-label={t("settingsAria")}
            >
              <Settings className="size-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("settingsAria")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={expandRailRef}
              variant="outline"
              size="icon"
              className="size-10 rounded-xl"
              aria-label={t("expandSidebarRailAria")}
              aria-expanded={false}
              onClick={expandSidebar}
            >
              <ChevronRight className="size-[18px]" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("expandSidebarTooltip")}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
