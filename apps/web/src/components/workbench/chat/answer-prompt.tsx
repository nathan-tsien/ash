"use client";

import type { PendingQuestion } from "@ash/shared";
import { Button } from "@ash/ui/button";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export interface AnswerPromptProps {
  question: PendingQuestion;
  onAnswer: (text: string) => void;
}

/**
 * Renders a pending praxis `ask_user` question and captures the user's answer.
 * Functional contract per the interactive-execution spec; visual treatment
 * follows docs/design-guidelines.md tokens.
 */
export function AnswerPrompt({ question, onAnswer }: AnswerPromptProps) {
  const t = useTranslations("Workbench");
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question.askId, question.text]);

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onAnswer(text);
    setValue("");
  };

  return (
    <section
      aria-live="polite"
      className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
    >
      <p className="text-sm font-medium text-foreground">{question.text}</p>
      <div className="mt-2 flex items-end gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          aria-label={t("answerLabel")}
          placeholder={t("answerPlaceholder")}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button type="button" variant="pill" size="sm" onClick={submit}>
          {t("answerSubmit")}
        </Button>
      </div>
    </section>
  );
}
