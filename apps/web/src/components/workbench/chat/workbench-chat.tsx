"use client";

import type { AshLocale, Conversation, Message } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { ScrollArea } from "@ash/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { Loader2, MessageSquare, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { WorkspaceToggleProps } from "../workbench-types";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";

export interface WorkbenchChatProps {
  locale: AshLocale;
  active: Conversation;
  workspace: WorkspaceToggleProps;
  banner?: ReactNode;
}

export function WorkbenchChat({ locale, active, workspace, banner }: WorkbenchChatProps) {
  const [draft, setDraft] = useState("");
  const [extraMessages, setExtraMessages] = useState<Message[]>([]);
  const t = useTranslations("Workbench");

  const messages = useMemo(
    () => [...active.messages, ...extraMessages],
    [active.messages, extraMessages],
  );

  const sendDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `local-user-${crypto.randomUUID()}`,
      role: "user",
      content: text,
      createdAt: now,
    };
    const ack: Message = {
      id: `local-bot-${crypto.randomUUID()}`,
      role: "assistant",
      content: t("chatMockAcknowledgement"),
      createdAt: new Date(Date.now() + 400).toISOString(),
    };
    setExtraMessages((prev) => [...prev, userMsg, ack]);
    setDraft("");
  }, [draft, t]);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight">{active.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{active.preview}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="size-9 rounded-xl"
                aria-label={
                  workspace.collapsed ? t("expandWorkbenchAria") : t("collapseWorkbenchAria")
                }
                aria-expanded={!workspace.collapsed}
                onClick={workspace.onToggle}
              >
                {workspace.collapsed ? (
                  <PanelRightOpen className="size-[18px]" aria-hidden />
                ) : (
                  <PanelRightClose className="size-[18px]" aria-hidden />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {workspace.collapsed
                ? t("expandWorkbenchTooltip")
                : t("collapseWorkbenchTooltip")}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
      {banner}
      <ScrollArea className="min-h-0 flex-1">
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((m) => (
            <MessageBubble key={m.id} locale={locale} message={m} />
          ))}
          {active.status === "running" && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("thinkingPlaceholder")}
            </div>
          )}
        </div>
      </ScrollArea>

      <Composer draft={draft} onDraftChange={setDraft} onSend={sendDraft} />
    </main>
  );
}
