import type { Message, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

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
            {isUser ? (
              <p className="whitespace-pre-wrap text-left">{message.content}</p>
            ) : (
              <div className="prose-chat text-left">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    a: ({ href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    ),
                    pre: ({ children, ...props }) => (
                      <pre className="relative" {...props}>
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatRelativeTime(message.createdAt, locale)}
          </p>
        </div>
      </div>
    );
  },
);
