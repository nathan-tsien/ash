"use client";

import type { AshLocale, Task, Project } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { Button } from "@ash/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useCallback, useSyncExternalStore } from "react";
import { taskHref, projectHref } from "@/lib/workbench-href";
import { formatRelativeTime } from "@ash/shared";

export interface WorkbenchHomeProps {
  locale: AshLocale;
  tasks: Task[];
  projects: Project[];
}

// Pending prompt handed over from the marketing quick-start dialog via
// sessionStorage. Modelled as an external store so the server snapshot is
// always null and hydration stays in sync — reading sessionStorage in a
// useState initializer would diverge from the server render and mismatch.
const PENDING_PROMPT_KEY = "ash_pending_prompt";
type Listener = () => void;
const pendingPromptListeners = new Set<Listener>();

function subscribePendingPrompt(listener: Listener) {
  pendingPromptListeners.add(listener);
  return () => pendingPromptListeners.delete(listener);
}

function getPendingPromptSnapshot(): string | null {
  try {
    return sessionStorage.getItem(PENDING_PROMPT_KEY);
  } catch {
    // sessionStorage unavailable
    return null;
  }
}

function getPendingPromptServerSnapshot(): string | null {
  return null;
}

function clearPendingPrompt() {
  try {
    sessionStorage.removeItem(PENDING_PROMPT_KEY);
  } catch {
    // sessionStorage unavailable
  }
  for (const listener of pendingPromptListeners) listener();
}

export function WorkbenchHome({ locale, tasks, projects }: WorkbenchHomeProps) {
  const t = useTranslations("Workbench");
  const recentTasks = tasks.slice(0, 6);
  const recentProjects = projects.slice(0, 4);

  const pendingPrompt = useSyncExternalStore(
    subscribePendingPrompt,
    getPendingPromptSnapshot,
    getPendingPromptServerSnapshot,
  );
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<{ id: string; role: "user" | "agent"; content: string }[]>([]);

  const handleStart = useCallback(() => {
    const prompt = pendingPrompt || draft.trim();
    if (!prompt) return;

    clearPendingPrompt();
    setDraft("");

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: prompt },
      { id: `agent-${Date.now()}`, role: "agent", content: t("thinkingPlaceholder") },
    ]);
  }, [pendingPrompt, draft, t]);

  const handleDismiss = useCallback(() => {
    clearPendingPrompt();
  }, []);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-4 py-16">
          {/* Pending prompt banner */}
          {pendingPrompt && (
            <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{t("pendingPromptLabel")}</p>
                  <p className="mt-1 truncate text-sm font-medium text-foreground">{pendingPrompt}</p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={t("dismissPromptAria")}
                >
                  <X className="size-4" />
                </button>
              </div>
              <Button onClick={handleStart} size="sm" className="mt-3 gap-1.5">
                {t("startTask")}
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Central input area */}
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
              <Sparkles className="size-7 text-muted-foreground" aria-hidden />
            </div>
            <h1 className="text-xl font-semibold">{t("homeTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("homeSubtitle")}</p>
          </div>

          {/* Quick composer when no pending prompt but user wants to type */}
          {!pendingPrompt && messages.length === 0 && (
            <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStart();
                }}
                placeholder={t("textareaPlaceholder")}
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                aria-label={t("textareaAria")}
              />
              <Button onClick={handleStart} variant="pill" size="sm">
                {t("send")}
              </Button>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="w-full space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-muted"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Tasks */}
          {recentTasks.length > 0 && (
            <section className="w-full">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("recentTasks")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={taskHref(task.id)}
                    className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatRelativeTime(task.updatedAt, locale)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {recentProjects.length > 0 && (
            <section className="w-full">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("projects")}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={projectHref(project.id)}
                    className="group rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {project.tasks.length} {t("tasksCount")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state when no tasks and no projects */}
          {recentTasks.length === 0 && recentProjects.length === 0 && messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">{t("homeEmptyTitle")}</p>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{t("homeEmptyBody")}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
