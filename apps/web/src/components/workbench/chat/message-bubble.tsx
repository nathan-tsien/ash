import type { Message, AshLocale } from "@ash/shared";
import { formatRelativeTime } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ash/ui/tooltip";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import gsap from "gsap";
import "@/lib/animations/gsap-setup";
import "highlight.js/styles/github-dark.css";

export interface MessageBubbleProps {
  message: Message;
  locale: AshLocale;
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ message, locale }, ref) {
    const isUser = message.role === "user";
    const t = useTranslations("Workbench");
    const [copied, setCopied] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleCopy = useCallback(async () => {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);

      // GSAP bounce animation
      if (buttonRef.current) {
        gsap.to(buttonRef.current, {
          scale: 0.85,
          duration: 0.1,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(buttonRef.current!, {
              scale: 1,
              duration: 0.25,
              ease: "back.out(1.7)",
            });
          },
        });
      }

      setTimeout(() => setCopied(false), 2000);
    }, [message.content]);

    return (
      <div
        ref={ref}
        className={cn(
          "group/bubble flex flex-col gap-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "relative",
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
          {/* Copy button — appears on hover */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                ref={buttonRef}
                variant="ghost"
                size="icon"
                type="button"
                className="absolute -right-2 -top-2 size-7 rounded-lg opacity-0 shadow-sm transition-opacity group-hover/bubble:opacity-100"
                aria-label={t("copyMessage")}
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="size-3.5 text-status-success-foreground" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {copied ? t("copiedMessage") : t("copyMessage")}
            </TooltipContent>
          </Tooltip>
          <p className="mt-1 text-label font-normal text-muted-foreground">
            {formatRelativeTime(message.createdAt, locale)}
          </p>
        </div>
      </div>
    );
  },
);
