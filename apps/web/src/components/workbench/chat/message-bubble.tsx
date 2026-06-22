import type { AshContentBlock, AshLocale, Message } from "@ash/shared";
import { Reasoning } from "./reasoning";
import { formatRelativeTime, textOf } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { Button } from "@ash/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ash/ui/tooltip";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardRef, useCallback, useRef, useState } from "react";
import type { Components } from "react-markdown";
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

const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
  pre: ({ children, ...props }) => (
    <pre className="relative" {...props}>
      {children}
    </pre>
  ),
};

/** Render one assistant content block by kind (ADR-0018 block model). */
function AssistantBlock({
  block,
  t,
  isStreaming,
}: {
  block: AshContentBlock;
  t: ReturnType<typeof useTranslations>;
  /** True while the owning message is actively streaming (from Message.isStreaming). */
  isStreaming: boolean;
}) {
  switch (block.kind) {
    case "text":
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={MARKDOWN_COMPONENTS}>
          {block.text}
        </ReactMarkdown>
      );
    case "thinking":
      // Reasoning surface — polished disclosure with streaming state (PRIN-2).
      return (
        <Reasoning
          text={block.text}
          isStreaming={isStreaming}
        />
      );
    case "tool_use":
      // Compact marker in the conversation; full args/result live in the
      // workspace tool-trace timeline.
      return (
        <span className="inline-flex w-fit items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-caption font-mono text-muted-foreground">
          {t("messageToolCall", { tool: block.toolName })}
        </span>
      );
    case "tool_result":
      // Surfaced in the workspace tool trace, not echoed in the chat stream.
      return null;
    case "image":
      return <span className="text-body-sm text-muted-foreground">{block.alt ?? t("messageImage")}</span>;
  }
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  function MessageBubble({ message, locale }, ref) {
    const isUser = message.role === "user";
    const t = useTranslations("Workbench");
    const [copied, setCopied] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const text = textOf(message);

    const handleCopy = useCallback(async () => {
      await navigator.clipboard.writeText(text);
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
    }, [text]);

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
            // User turns are bounded interjections (filled chip); assistant turns
            // are the primary content and take the full reading measure. Hierarchy
            // comes from structure, not a near-identical bubble pair (PRIN-4).
            isUser ? "max-w-[80%] text-right" : "w-full",
          )}
        >
          <div
            className={cn(
              "text-sm leading-relaxed",
              isUser
                // User: filled chip, distinct from the canvas.
                ? "rounded-xl bg-secondary px-3.5 py-2.5 text-secondary-foreground"
                // Assistant: borderless prose directly on the canvas, no card chrome.
                : "text-foreground",
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap text-left">{text}</p>
            ) : (
              <div className="prose-chat flex flex-col gap-2 text-left">
                {message.blocks.map((block, i) => (
                  <AssistantBlock key={i} block={block} t={t} isStreaming={message.isStreaming ?? false} />
                ))}
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
          {/* Timestamp is secondary provenance: kept in the DOM (screen readers,
              layout reserved) but revealed on hover/focus so it does not clutter
              every turn at rest (PRIN-2). */}
          <p className="mt-1 text-label font-normal text-muted-foreground opacity-0 transition-opacity group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100">
            {formatRelativeTime(message.createdAt, locale)}
          </p>
        </div>
      </div>
    );
  },
);
