import type { Message, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { forwardRef } from "react";

export interface MessageBubbleProps {
  message: Message;
  locale: AshLocale;
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ message, locale }, ref) {
    const isUser = message.role === "user";
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            isUser ? "max-w-[90%]" : "max-w-[90%]",
            isUser ? "items-end text-right" : "items-start",
          )}
        >
          <div
            className={cn(
              "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-secondary text-secondary-foreground"
                : "border border-border bg-card",
            )}
          >
            <p className="whitespace-pre-wrap text-left">{message.content}</p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatRelativeTime(message.createdAt, locale)}
          </p>
        </div>
      </div>
    );
  },
);
