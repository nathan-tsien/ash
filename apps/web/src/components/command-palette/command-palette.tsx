"use client";

import { useCommandPalette } from "./command-palette-provider";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  FolderPlus,
  Home,
  ListTodo,
  MessageSquarePlus,
  Search,
  Settings,
  SquarePlus,
} from "lucide-react";
import { useCallback } from "react";
import { Command } from "cmdk";
import type { Task, Project } from "@ash/shared";

interface CommandPaletteProps {
  onToggleWorkspace?: () => void;
  tasks?: Task[];
  projects?: Project[];
}

// Backdrop + panel built on cmdk's Command.Dialog, which wraps Radix Dialog
// (UX-4): focus trap, focus return, Escape/outside-click dismissal and scroll
// lock come for free. Enter/exit motion is the project's standard data-state
// animation (MOTION-2 base scale, symmetric for a Radix overlay) rather than a
// hand-rolled GSAP entrance with an instant unmount.
const OVERLAY_CLASS =
  "fixed inset-0 z-50 bg-overlay backdrop-blur-sm " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out " +
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0";

const CONTENT_CLASS =
  "fixed left-1/2 top-[20vh] z-50 w-full max-w-lg -translate-x-1/2 " +
  "overflow-hidden rounded-2xl border border-border bg-card shadow-2xl duration-200 " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out " +
  "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 " +
  "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 " +
  "data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2";

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent";

export function CommandPalette({
  onToggleWorkspace,
  tasks = [],
  projects = [],
}: CommandPaletteProps) {
  const { open, closePalette } = useCommandPalette();
  const { openSettings } = useSettingsModal();
  const t = useTranslations("CommandPalette");
  const tWorkbench = useTranslations("Workbench");
  const router = useRouter();

  const runAction = useCallback(
    (action: () => void) => {
      action();
      closePalette();
    },
    [closePalette],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closePalette();
      }}
      label={tWorkbench("commandPaletteAria")}
      overlayClassName={OVERLAY_CLASS}
      contentClassName={CONTENT_CLASS}
      filter={(value, search) =>
        value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
      }
    >
      {/* focus-within ring (UX-3): the input is transparent, so the search row
          carries the focus affordance; ring-inset is clipped to the card's
          rounded top by its overflow-hidden. */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Command.Input
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          placeholder={t("placeholder")}
          autoFocus
        />
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-2">
        <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
          {t("noResults")}
        </Command.Empty>

        {/* Tasks search group */}
        {tasks.length > 0 && (
          <Command.Group heading={t("groupTasks")} className="px-2">
            {tasks.map((task) => (
              <Command.Item
                key={task.id}
                value={`task-${task.id}-${task.title}`}
                className={ITEM_CLASS}
                onSelect={() => runAction(() => router.push(`/app/task/${task.id}`))}
              >
                <ListTodo className="size-4 text-muted-foreground" />
                <span className="truncate">{task.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Projects search group */}
        {projects.length > 0 && (
          <Command.Group heading={t("groupProjects")} className="px-2">
            {projects.map((project) => (
              <Command.Item
                key={project.id}
                value={`project-${project.id}-${project.name}`}
                className={ITEM_CLASS}
                onSelect={() => runAction(() => router.push(`/app/project/${project.id}`))}
              >
                <Search className="size-4 text-muted-foreground" />
                <span className="truncate">{project.name}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Separator className="my-1 h-px bg-border" />

        <Command.Group heading={t("groupNavigation")} className="px-2">
          <Command.Item
            value={t("switchConversation")}
            className={ITEM_CLASS}
            onSelect={() =>
              runAction(() => {
                /* focus sidebar search */
                const input = document.querySelector<HTMLInputElement>(
                  '[aria-label="' + tWorkbench("searchAria") + '"]',
                );
                input?.focus();
              })
            }
          >
            <Search className="size-4 text-muted-foreground" />
            {t("switchConversation")}
          </Command.Item>
          <Command.Item
            value={t("goHome")}
            className={ITEM_CLASS}
            onSelect={() => runAction(() => router.push("/"))}
          >
            <Home className="size-4 text-muted-foreground" />
            {t("goHome")}
          </Command.Item>
          <Command.Item
            value={t("newConversation")}
            className={ITEM_CLASS}
            onSelect={() => runAction(() => router.push("/"))}
          >
            <MessageSquarePlus className="size-4 text-muted-foreground" />
            {t("newConversation")}
          </Command.Item>
        </Command.Group>

        <Command.Separator className="my-1 h-px bg-border" />

        <Command.Group heading={t("groupActions")} className="px-2">
          <Command.Item
            value={t("newTask")}
            className={ITEM_CLASS}
            onSelect={() => runAction(() => router.push("/app"))}
          >
            <SquarePlus className="size-4 text-muted-foreground" />
            {t("newTask")}
          </Command.Item>
          <Command.Item
            value={t("newProject")}
            className={ITEM_CLASS}
            onSelect={() => runAction(() => {})}
          >
            <FolderPlus className="size-4 text-muted-foreground" />
            {t("newProject")}
          </Command.Item>
          <Command.Item
            value={t("openSettings")}
            className={ITEM_CLASS}
            onSelect={() => runAction(() => openSettings("account"))}
          >
            <Settings className="size-4 text-muted-foreground" />
            {t("openSettings")}
          </Command.Item>
          {onToggleWorkspace && (
            <Command.Item
              value={t("toggleWorkspace")}
              className={ITEM_CLASS}
              onSelect={() => runAction(onToggleWorkspace)}
            >
              <ArrowLeftRight className="size-4 text-muted-foreground" />
              {t("toggleWorkspace")}
            </Command.Item>
          )}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
