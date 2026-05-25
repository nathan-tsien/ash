import type { ToolTrace } from "@ash/shared";
import { Badge } from "@ash/ui/badge";
import { Loader2, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function ToolsCard({ traces }: { traces: ToolTrace[] }) {
  const t = await getTranslations("Workbench");

  return (
    <div className="space-y-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("toolsHeading")}
      </h2>
      {traces.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyTools")}</p>
      ) : (
        <ul className="space-y-3">
          {traces.map((trace) => (
            <li key={trace.id} className="flex gap-2 text-sm">
              <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md bg-muted px-1.5 py-px text-[11px] font-mono">
                    {trace.toolName}
                  </code>
                  {trace.durationMs !== undefined ? (
                    <span className="text-[11px] text-muted-foreground">
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
  if (status === "success") return <Badge variant="success">ok</Badge>;
  if (status === "error") return <Badge variant="destructive">err</Badge>;
  return <Badge variant="secondary">···</Badge>;
}
