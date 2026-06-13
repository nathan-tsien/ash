"use client";

import type { ToolTrace } from "@ash/shared";
import { Badge } from "@ash/ui/badge";
import { cn } from "@ash/ui/lib/utils";
import { Loader2, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

export function ToolsCard({ traces }: { traces: ToolTrace[] }) {
  const t = useTranslations("Workbench");

  return (
    <div className="space-y-2">
      <h2 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
        {t("toolsHeading")}
      </h2>
      {traces.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyTools")}</p>
      ) : (
        <ul className="space-y-1 rounded-lg bg-muted/30 p-2">
          {traces.map((trace, i) => (
            <li key={trace.id} className={cn("flex gap-2 rounded-md px-2 py-1.5 text-sm", i % 2 === 0 && "bg-muted/40")}>
              <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md bg-muted px-1.5 py-px text-caption font-mono">
                    {trace.toolName}
                  </code>
                  {trace.durationMs !== undefined ? (
                    <span className="text-caption text-muted-foreground">
                      {trace.durationMs} ms
                    </span>
                  ) : trace.status === "running" ? (
                    <Loader2 className="inline size-3 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{trace.summary}</p>
              </div>
              <ToolBadge status={trace.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ToolBadge({ status }: { status: ToolTrace["status"] }) {
  const t = useTranslations("Workbench");
  if (status === "success") {
    return <Badge variant="success">{t("toolStatusOk")}</Badge>;
  }
  if (status === "error") {
    return <Badge variant="destructive">{t("toolStatusError")}</Badge>;
  }
  return <Badge variant="secondary">{t("toolStatusRunning")}</Badge>;
}
