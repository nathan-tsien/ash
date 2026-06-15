"use client";

import type { AshLocale, Conversation, Message, PendingQuestion } from "@ash/shared";
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
import { AnswerPrompt } from "./answer-prompt";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { ScrollToBottom } from "./scroll-to-bottom";

export interface WorkbenchChatProps {
  locale: AshLocale;
  active: Conversation;
  workspace: WorkspaceToggleProps;
  banner?: ReactNode;
  pendingQuestion?: PendingQuestion;
  onAnswer?: (text: string) => void;
  /**
   * When provided, the composer routes non-answer submits to this handler
   * instead of appending locally. Pass when the chat is bound to a Task that
   * supports follow-up messages (the provider handles the optimistic append).
   */
  onFollowUp?: (text: string) => Promise<void>;
  /**
   * When provided, a cancel control is shown for a non-terminal task and invokes
   * this handler. Passed only for task views (not project conversations), so the
   * control never appears where there is no cancellable praxis task.
   */
  onCancel?: () => void;
}

export function WorkbenchChat({ locale, active, workspace, banner, pendingQuestion, onAnswer, onFollowUp, onCancel }: WorkbenchChatProps) {
  const [draft, setDraft] = useState("");
  const [extraMessages, setExtraMessages] = useState<Message[]>([]);
  const t = useTranslations("Workbench");

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // Ids whose entrance has already played. Diffing by id (not by count) is robust
  // to the SSE reconciliation window where an optimistic user bubble is replaced
  // by its persisted twin: the list can change without growing, so an index slice
  // would mis-target — and a re-keyed bubble left at messageEntrance()'s
  // autoAlpha:0 would stay hidden (MOTION-1: motion never hides content).
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  const messages = useMemo(
    () => [...active.messages, ...extraMessages],
    [active.messages, extraMessages],
  );

  const sendDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (pendingQuestion && onAnswer) {
      // While the agent is awaiting an answer, the composer answers the pending
      // question (same path as AnswerPrompt) rather than sending a free follow-up
      // — praxis expects an answer keyed to the live ask_id, not a /messages turn.
      onAnswer(text);
      return;
    }
    if (onFollowUp) {
      // Provider handles the optimistic user-message append; do NOT also append
      // locally — that would duplicate the message in the rendered list since
      // active.messages (from the provider) already contains it after the upsert.
      void onFollowUp(text);
      return;
    }
    // Fallback: no follow-up handler (e.g. project views) — append locally for
    // a lightweight optimistic display.
    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `local-user-${crypto.randomUUID()}`,
      role: "user",
      content: text,
      createdAt: now,
    };
    setExtraMessages((prev) => [...prev, userMsg]);
  }, [draft, pendingQuestion, onAnswer, onFollowUp]);

  /* Staggered entrance when conversation changes. */
  useGSAP(
    () => {
      const bubbles = gsap.utils.toArray<HTMLElement>(".message-bubble");
      // Re-seed the seen set to the rendered conversation so the per-message
      // effect treats nothing here as "new" and the cross-fade owns this batch.
      seenMessageIdsRef.current = new Set(messages.map((m) => m.id));
      if (bubbles.length === 0) return;

      gsap.from(bubbles, {
        ...messageStagger(),
        // Defensive: clear inline autoAlpha/visibility once the batch settles so a
        // bubble can never be left visibility:hidden (MOTION-1).
        onComplete: () => gsap.set(bubbles, { clearProps: "opacity,visibility" }),
      });
    },
    { scope: containerRef, dependencies: [active.id] },
  );

  /* Entrance animation for messages whose id has not yet been animated. */
  useGSAP(
    () => {
      const seen = seenMessageIdsRef.current;
      const bubbles = gsap.utils.toArray<HTMLElement>(".message-bubble");
      const newBubbles = bubbles.filter((el) => {
        const id = el.dataset.messageId;
        return id !== undefined && !seen.has(id);
      });

      // Mark every currently-rendered id as seen, including reconciled twins that
      // are not animated here — so a later re-render never replays their entrance.
      for (const m of messages) seen.add(m.id);

      if (newBubbles.length > 0) {
        const tl = gsap.timeline();
        tl.from(newBubbles, {
          ...messageEntrance(),
          // Clear inline autoAlpha/visibility on settle so a bubble that gets
          // re-keyed during the live SSE window can never stay hidden (MOTION-1).
          onComplete: () => gsap.set(newBubbles, { clearProps: "opacity,visibility" }),
        });
        tl.call(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, undefined, "<0.1");
      }
    },
    { scope: containerRef, dependencies: [messages.map((m) => m.id).join("|")] },
  );

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-body-lg font-semibold leading-tight">{active.title}</h1>
            <p className="truncate text-label font-normal text-muted-foreground">{active.preview}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onCancel && (active.status === "running" || Boolean(pendingQuestion)) ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onCancel}
            >
              {t("cancelTask")}
            </Button>
          ) : null}
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
      <div ref={scrollAreaRef} className="relative flex min-h-0 flex-1 flex-col">
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
                <p className="max-w-sm text-body-sm font-normal leading-relaxed text-muted-foreground">{t("emptyChatBody")}</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} data-message-id={m.id} className="message-bubble">
                  <MessageBubble locale={locale} message={m} />
                </div>
              ))
            )}
            {pendingQuestion && onAnswer && (
              <div className="message-bubble">
                <AnswerPrompt question={pendingQuestion} onAnswer={onAnswer} />
              </div>
            )}
            {active.status === "running" && (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-label font-normal text-muted-foreground">
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
