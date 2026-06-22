import { cn } from "@ash/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export interface ReasoningProps {
  /** The thinking block text to display in the body. */
  text: string;
  /** True while the owning assistant message is actively streaming. */
  isStreaming: boolean;
  /**
   * Elapsed duration in seconds. When provided (e.g. from tests), overrides
   * the internal wall-clock timer. In production, omit and let the component
   * compute elapsed time itself.
   */
  durationSeconds?: number;
}

/**
 * Reasoning disclosure component — renders an Ash thinking block.
 *
 * Behaviour:
 * - Auto-expands while streaming; auto-collapses shortly after streaming ends.
 * - Remains user-toggleable at any time.
 * - Shows "Ash 思考中…" header while streaming; "已思考 N 秒" when done.
 * - Animated chevron indicates open/closed state.
 */
export function Reasoning({ text, isStreaming, durationSeconds }: ReasoningProps) {
  const t = useTranslations("Workbench");

  // Internal elapsed-seconds timer; overridden by the injected prop in tests.
  // Ticked via setInterval — no synchronous setState in effects.
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  /**
   * Open state:
   * - Starts open if streaming, closed otherwise.
   * - Auto-collapses after streaming ends.
   * - User-toggleable at any time.
   */
  const [isOpen, setIsOpen] = useState(isStreaming);
  // Has this component ever seen isStreaming=true?
  const hasStreamedRef = useRef(isStreaming);

  // Streaming timer effect — no synchronous setState calls, only deferred ones.
  useEffect(() => {
    if (isStreaming) {
      hasStreamedRef.current = true;
      // Record start; first tick at 1s.
      startRef.current = Date.now();

      const id = setInterval(() => {
        if (startRef.current !== null) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }
      }, 1000);

      return () => clearInterval(id);
    }

    // Streaming ended — freeze elapsed via deferred update in next microtask.
    if (startRef.current !== null) {
      const frozen = Math.floor((Date.now() - startRef.current) / 1000);
      // Use a timeout(0) to keep this out of the synchronous effect body.
      const id = setTimeout(() => setElapsed(frozen), 0);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  // Open/collapse state effect — kept separate from the timer.
  useEffect(() => {
    if (!isStreaming) {
      if (!hasStreamedRef.current) {
        // Mounted in done state — collapse immediately via deferred update.
        const id = setTimeout(() => setIsOpen(false), 0);
        return () => clearTimeout(id);
      }
      // Was streaming, now done — auto-collapse after a short visual delay.
      const id = setTimeout(() => setIsOpen(false), 600);
      return () => clearTimeout(id);
    }
    // Streaming started — open.
    const id = setTimeout(() => setIsOpen(true), 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Use the injected value when provided (deterministic in tests).
  const displaySeconds = durationSeconds !== undefined ? durationSeconds : elapsed;

  const headerLabel = isStreaming
    ? t("reasoningStreaming")
    : t("reasoningDone", { n: displaySeconds });

  return (
    <div className="rounded-md bg-muted/40 text-body-sm text-muted-foreground">
      {/* Header button — toggles body */}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-label font-medium select-none cursor-pointer"
      >
        {/* Animated streaming indicator dot */}
        {isStreaming && (
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full bg-muted-foreground/60 animate-pulse"
          />
        )}
        <span className="flex-1">{headerLabel}</span>
        {/* Animated chevron */}
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-200",
            isOpen ? "rotate-0" : "-rotate-90",
          )}
          aria-hidden="true"
        />
      </button>

      {/* Collapsible body */}
      <div
        data-state={isOpen ? "open" : "closed"}
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <p className="px-2 pb-2 whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
