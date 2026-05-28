"use client";

import type { AshLocale, Conversation } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { Input } from "@ash/ui/input";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Separator } from "@ash/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
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
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FooterAccount } from "./footer-account";
import { SidebarRow } from "./sidebar-row";

export interface WorkbenchSidebarProps {
  locale: AshLocale;
  conversations: Conversation[];
  activeId: string;
}

export function WorkbenchSidebar({
  locale,
  conversations,
  activeId,
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

  const filtered = useMemo(() => {
    const q = sidebarQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q),
    );
  }, [conversations, sidebarQuery]);

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
          .to(aside, { width: 56, duration: 0.25, ease: "power3.out" }, "<0.05")
          .to(collapsed, fadeIn(0.15), "<0.1");
      } else {
        const tl = gsap.timeline();
        tl.to(collapsed, fadeOut(0.1))
          .to(aside, { width: 260, duration: 0.35, ease: "power2.out" }, "<0.05")
          .to(expanded, fadeIn(), "<0.1");
      }
    },
    { dependencies: [sidebarCollapsed], scope: asideRef },
  );

  const sidebarListId = "workbench-sidebar-conversations";

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
      className="flex w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar"
    >
      {/* Header: home link visible in both states */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-accent"
              aria-label={t("sidebarHomeAria")}
            >
              <Sparkles className="size-[18px]" aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("tooltipHomeChrome")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Expanded content: brand, search, conversation list, footer */}
      <div ref={expandedContentRef} className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5">
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-semibold">{t("sidebarBrand")}</p>
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

        <div className="space-y-2 px-3 py-3">
          <Button variant="pill" size="sm" className="w-full justify-center gap-2" asChild>
            <Link href="/">
              <Plus className="size-4" aria-hidden />
              {t("newTask")}
            </Link>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="w-full gap-2 text-muted-foreground"
                aria-label={t("commandPaletteAria")}
                onClick={openPalette}
              >
                <span className="text-xs">{t("cmdK")}</span>
                <Search className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("commandPaletteTooltip")}</TooltipContent>
          </Tooltip>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded-xl pl-8 text-sm"
              placeholder={t("searchPlaceholder")}
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              aria-label={t("searchAria")}
            />
          </div>
        </div>
        <Separator />
        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label={t("sidebarConversationsAria")}>
            <ul
              id={sidebarListId}
              role="list"
              className="flex flex-col gap-0.5 py-2 pr-2"
            >
              {filtered.map((c) => (
                <SidebarRow key={c.id} locale={locale} c={c} activeId={activeId} />
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {t("emptySearch")}
                </li>
              )}
            </ul>
          </nav>
        </ScrollArea>
        <FooterAccount />
      </div>

      {/* Collapsed rail: icon buttons for quick actions */}
      <div
        ref={collapsedRailRef}
        className="mt-auto flex flex-col items-center gap-2 pb-3"
        style={{ opacity: 0, visibility: "hidden" }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 rounded-xl active:bg-sidebar-accent" asChild>
              <Link href="/" aria-label={t("newTask")}>
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
              onClick={() => openSettings("account")}
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
