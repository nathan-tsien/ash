"use client";

import { useCommandPalette } from "./command-palette-provider";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { useCallback, useEffect, useRef } from "react";
import { Command } from "cmdk";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import type { Task, Project } from "@ash/shared";

interface CommandPaletteProps {
  onToggleWorkspace?: () => void;
  tasks?: Task[];
  projects?: Project[];
}

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
  const dialogRef = useRef<HTMLDivElement>(null);

  // GSAP entrance animation
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    gsap.fromTo(
      dialogRef.current,
      { autoAlpha: 0, y: -8, scale: 0.98 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
    );
  }, [open]);

  const runAction = useCallback(
    (action: () => void) => {
      action();
      closePalette();
    },
    [closePalette],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      role="dialog"
      aria-modal="true"
      aria-label={tWorkbench("commandPaletteAria")}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closePalette}
        aria-hidden
      />
      {/* Panel */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        style={{ opacity: 0 }}
      >
        <Command
          onKeyDown={(e) => {
            if (e.key === "Escape") closePalette();
          }}
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
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
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                    onSelect={() =>
                      runAction(() => router.push(`/app/task/${task.id}`))
                    }
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
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                    onSelect={() =>
                      runAction(() =>
                        router.push(`/app/project/${project.id}`),
                      )
                    }
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
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
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
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => runAction(() => router.push("/"))}
              >
                <Home className="size-4 text-muted-foreground" />
                {t("goHome")}
              </Command.Item>
              <Command.Item
                value={t("newConversation")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
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
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => runAction(() => router.push("/app"))}
              >
                <SquarePlus className="size-4 text-muted-foreground" />
                {t("newTask")}
              </Command.Item>
              <Command.Item
                value={t("newProject")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() => runAction(() => {})}
              >
                <FolderPlus className="size-4 text-muted-foreground" />
                {t("newProject")}
              </Command.Item>
              <Command.Item
                value={t("openSettings")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                onSelect={() =>
                  runAction(() => openSettings("account"))
                }
              >
                <Settings className="size-4 text-muted-foreground" />
                {t("openSettings")}
              </Command.Item>
              {onToggleWorkspace && (
                <Command.Item
                  value={t("toggleWorkspace")}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm aria-selected:bg-accent"
                  onSelect={() => runAction(onToggleWorkspace)}
                >
                  <ArrowLeftRight className="size-4 text-muted-foreground" />
                  {t("toggleWorkspace")}
                </Command.Item>
              )}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
