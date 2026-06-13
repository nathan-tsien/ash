"use client";

import type { AshLocale, Conversation, Message } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { ScrollArea } from "@ash/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ash/ui/tooltip";
import { Loader2, MessageSquare, PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import { messageEntrance, messageStagger } from "@/lib/animations/presets";
import type { WorkspaceToggleProps } from "../workbench-types";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { ScrollToBottom } from "./scroll-to-bottom";

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

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

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
    setExtraMessages((prev) => [...prev, userMsg]);
    setDraft("");
  }, [draft]);

  /* Staggered entrance when conversation changes. */
  useGSAP(
    () => {
      const bubbles = gsap.utils.toArray<HTMLElement>(".message-bubble");
      if (bubbles.length === 0) return;

      gsap.from(bubbles, messageStagger());

      prevMessageCountRef.current = messages.length;
    },
    { scope: containerRef, dependencies: [active.id] },
  );

  /* Entrance animation for newly added messages. */
  useGSAP(
    () => {
      if (messages.length <= prevMessageCountRef.current) {
        prevMessageCountRef.current = messages.length;
        return;
      }

      const bubbles = gsap.utils.toArray<HTMLElement>(".message-bubble");
      const newBubbles = bubbles.slice(prevMessageCountRef.current);

      if (newBubbles.length > 0) {
        const tl = gsap.timeline();
        tl.from(newBubbles, messageEntrance());
        tl.call(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, undefined, "<0.1");
      }

      prevMessageCountRef.current = messages.length;
    },
    { scope: containerRef, dependencies: [messages.length] },
  );

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-body-lg font-semibold leading-tight">{active.title}</h1>
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
      <div ref={scrollAreaRef} className="relative min-h-0 flex-1">
        <ScrollArea className="min-h-0 flex-1">
          <div
            ref={containerRef}
            className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card">
                  <Sparkles className="size-6 text-muted-foreground" aria-hidden />
                </div>
                <h2 className="text-body-lg font-semibold text-foreground">{t("emptyChatTitle")}</h2>
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("emptyChatBody")}</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="message-bubble">
                  <MessageBubble locale={locale} message={m} />
                </div>
              ))
            )}
            {active.status === "running" && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <Loader2
                  ref={(el) => {
                    if (el) {
                      gsap.to(el, {
                        scale: 1.05,
                        repeat: -1,
                        yoyo: true,
                        duration: 0.6,
                        ease: "power1.inOut",
                      });
                    }
                  }}
                  className="size-4"
                  aria-hidden
                />
                {t("thinkingPlaceholder")}
              </div>
            )}
            <div ref={messagesEndRef} aria-hidden />
          </div>
          <ScrollToBottom scrollAreaRef={scrollAreaRef} targetRef={messagesEndRef} />
        </ScrollArea>
      </div>

      <Composer draft={draft} onDraftChange={setDraft} onSend={sendDraft} />
    </main>
  );
}
