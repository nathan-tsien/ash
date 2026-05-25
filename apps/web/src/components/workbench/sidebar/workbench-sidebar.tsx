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
import { cn } from "@ash/ui/lib/utils";
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
  const expandRailRef = useRef<HTMLButtonElement>(null);
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  // Tracks the most recent user-driven toggle so focus restoration ignores the initial mount.
  const lastToggleRef = useRef<"none" | "collapse" | "expand">("none");
  const t = useTranslations("Workbench");
  const { openSettings } = useSettingsModal();

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
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
        sidebarCollapsed ? "w-[56px]" : "w-[260px]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5",
          sidebarCollapsed && "flex-col justify-center gap-2 px-1 py-3",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-colors hover:bg-accent",
              )}
              aria-label={t("sidebarHomeAria")}
            >
              <Sparkles className="size-[18px]" aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("tooltipHomeChrome")}</TooltipContent>
        </Tooltip>

        {!sidebarCollapsed && (
          <>
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
          </>
        )}
      </div>

      {sidebarCollapsed ? null : (
        <>
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
        </>
      )}

      {sidebarCollapsed && (
        <div className="mt-auto flex flex-col items-center gap-2 pb-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10 rounded-xl" asChild>
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
                className="size-10 rounded-xl"
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
                variant="ghost"
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
      )}
    </aside>
  );
}
