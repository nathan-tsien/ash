"use client";

import type { ProcessEvent, ProcessEventStatus } from "@ash/shared";
import { StatusDot } from "@ash/ui/status-dot";
import { cn } from "@ash/ui/lib/utils";
import { useTranslations } from "next-intl";

// Map ProcessEvent status → StatusDot visual variant.
function dotStatus(s: ProcessEventStatus): "running" | "success" | "error" | "idle" {
  if (s === "running") return "running";
  if (s === "success") return "success";
  if (s === "error") return "error";
  return "idle"; // "info" (ask) reads as neutral
}

export function ProcessTab({
  events,
  onSelect,
}: {
  events: ProcessEvent[];
  onSelect?: (messageId: string) => void;
}) {
  const t = useTranslations("Workbench");
  if (events.length === 0) {
    return <p className="px-1 py-6 text-center text-body-sm text-muted-foreground">{t("processEmpty")}</p>;
  }
  return (
    <ol className="ml-1">
      {events.map((ev, i) => {
        const clickable = Boolean(ev.messageId && onSelect);
        return (
          <li
            key={ev.id}
            className={cn("relative flex gap-3 border-l border-border pl-4", i < events.length - 1 && "pb-3")}
          >
            <StatusDot status={dotStatus(ev.status)} label={ev.status} className="absolute left-0 top-1.5 -ml-[5px]" />
            <button
              type="button"
              disabled={!clickable}
              onClick={() => ev.messageId && onSelect?.(ev.messageId)}
              className={cn(
                "min-w-0 flex-1 text-left",
                clickable && "rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !clickable && "cursor-default",
              )}
            >
              <code className="rounded-md bg-muted px-1.5 py-px text-caption font-mono">{ev.label}</code>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
