"use client";

import { useRef } from "react";
import { Button } from "@ash/ui/button";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useTranslations } from "next-intl";
import "@/lib/animations/gsap-setup";

export interface ComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function Composer({ draft, onDraftChange, onSend }: ComposerProps) {
  const t = useTranslations("Workbench");
  const containerRef = useRef<HTMLDivElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  // Focus animation on textarea
  useGSAP(
    () => {
      const textarea = containerRef.current?.querySelector("textarea");
      if (!textarea) return;

      const onFocus = () => {
        gsap.to(containerRef.current, {
          scale: 1.01,
          duration: 0.2,
          ease: "power2.out",
        });
      };

      const onBlur = () => {
        gsap.to(containerRef.current, {
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
        });
      };

      textarea.addEventListener("focus", onFocus);
      textarea.addEventListener("blur", onBlur);

      return () => {
        textarea.removeEventListener("focus", onFocus);
        textarea.removeEventListener("blur", onBlur);
      };
    },
    { scope: containerRef },
  );

  // Send button press animation
  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleSendPress = contextSafe(() => {
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
  });

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <div
          ref={containerRef}
          className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
        >
          <textarea
            className="max-h-[168px] min-h-[72px] w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            placeholder={t("textareaPlaceholder")}
            value={draft}
            aria-label={t("textareaAria")}
            aria-multiline="true"
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSend();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">{t("shortcutHint")}</p>
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
