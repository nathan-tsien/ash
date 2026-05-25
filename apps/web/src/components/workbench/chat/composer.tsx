"use client";

import { Button } from "@ash/ui/button";
import { useTranslations } from "next-intl";

export interface ComposerProps {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}

export function Composer({ draft, onDraftChange, onSend }: ComposerProps) {
  const t = useTranslations("Workbench");

  return (
    <div className="shrink-0 border-t border-border bg-background px-4 py-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-xs">
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
          <Button type="button" variant="pill" size="sm" onClick={onSend}>
            {t("send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
