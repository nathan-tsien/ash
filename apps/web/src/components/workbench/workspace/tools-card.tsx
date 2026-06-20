"use client";

import type { ToolTrace } from "@ash/shared";
import { StatusDot } from "@ash/ui/status-dot";
import { cn } from "@ash/ui/lib/utils";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ToolsCard({ traces }: { traces: ToolTrace[] }) {
  const t = useTranslations("Workbench");

  return (
    <div className="space-y-2">
      <h2 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
        {t("toolsHeading")}
      </h2>
      {traces.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t("emptyTools")}</p>
      ) : (
        // Timeline rail: a single vertical hairline runs through the dot column.
        // Oldest top, newest bottom (mirrors conversational reading).
        <ol className="rounded-lg bg-muted/30 p-3">
          {traces.map((trace, i) => (
            <ToolRow key={trace.id} trace={trace} last={i === traces.length - 1} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ToolRow({ trace, last }: { trace: ToolTrace; last: boolean }) {
  const t = useTranslations("Workbench");
  const [open, setOpen] = useState(false);

  // input/result are optional detail fields on the shared ToolTrace contract;
  // surface the disclosure only when at least one is present.
  const { input, result } = trace;
  const hasDetail = Boolean(input) || Boolean(result);

  const statusLabel =
    trace.status === "success"
      ? t("toolStatusOk")
      : trace.status === "error"
        ? t("toolStatusError")
        : t("toolStatusRunning");

  return (
    <li
      className={cn(
        // Hairline rail sits at the dot x; -2px optical alignment matches
        // plan-card.tsx so the dot visually centers on the rail.
        "relative flex gap-3 border-l border-border pl-4",
        !last && "pb-3",
      )}
    >
      {/* Status node hung on the rail. -ml puts the dot center on the border. */}
      <StatusDot
        status={trace.status}
        label={statusLabel}
        className="absolute left-0 top-1.5 -ml-[5px]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <code className="rounded-md bg-muted px-1.5 py-px text-caption font-mono">
            {trace.toolName}
          </code>
          {trace.durationMs !== undefined ? (
            <span className="ml-auto text-caption tabular-nums text-muted-foreground">
              {trace.durationMs} ms
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-body-sm text-muted-foreground">{trace.summary}</p>
        {hasDetail ? (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-1 inline-flex items-center gap-1 rounded-sm text-caption text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                className={cn("size-3 transition-transform", open && "rotate-90")}
              />
              {open ? t("toolCollapse") : t("toolExpand")}
            </button>
            {open ? (
              <div className="mt-1 space-y-2">
                {input ? <ToolDetail label={t("toolInput")} value={input} /> : null}
                {result ? <ToolDetail label={t("toolResult")} value={result} /> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}

function ToolDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {/* Cap height so a large tool payload scrolls inside its own box instead
          of expanding the workspace pane vertically (UX). */}
      <pre className="max-h-48 overflow-auto rounded-md bg-muted px-2 py-1.5 text-caption font-mono text-foreground">
        {value}
      </pre>
    </div>
  );
}
