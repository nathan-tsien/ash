"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@ash/ui/button";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import "@/lib/animations/gsap-setup";
import { useEnterSubmit } from "./use-enter-submit";

export interface ComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function Composer({ draft, onDraftChange, onSend }: ComposerProps) {
  const t = useTranslations("Workbench");
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const enterSubmit = useEnterSubmit<HTMLTextAreaElement>(onSend);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    // 168 mirrors the max-h-[168px] cap on the textarea below; keep both in sync.
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`;
  }, [draft]);

  // Focus is signalled by the container's focus-within ring (no GSAP scale on the
  // full-bleed bar — scaling a centered element nudges sub-pixel layout, MOTION-6).

  // Send button press animation
  const handleSendPress = useCallback(() => {
    if (!sendButtonRef.current) return;
    gsap.to(sendButtonRef.current, {
      scale: 0.95,
      duration: 0.1,
      ease: "power2.out",
      onComplete: () => {
        gsap.to(sendButtonRef.current!, {
          scale: 1,
          duration: 0.2,
          ease: "back.out(1.7)",
        });
      },
    });
  }, []);

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <div
          className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
        >
          {/* Composer rests at ~2 rows and grows to ~7 (48px-168px at the 14px/1.625 line-height, both 4px-grid multiples) before scrolling (SPACE-1 documented off-scale values) */}
          <textarea
            ref={textareaRef}
            className="max-h-[168px] min-h-[48px] w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            placeholder={t("textareaPlaceholder")}
            value={draft}
            aria-label={t("textareaAria")}
            aria-multiline="true"
            onChange={(e) => onDraftChange(e.target.value)}
            onCompositionStart={enterSubmit.onCompositionStart}
            onCompositionEnd={enterSubmit.onCompositionEnd}
            onKeyDown={enterSubmit.onKeyDown}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-label text-muted-foreground">{t("shortcutHint")}</p>
          <Button
            ref={sendButtonRef}
            type="button"
            variant="pill"
            size="sm"
            onClick={() => {
              handleSendPress();
              onSend();
            }}
          >
            {t("send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
