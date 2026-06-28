import type { PlanStep } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { StatusChip } from "@ash/ui/status-chip";
import { AlertCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function PlanCard({ steps }: { steps: PlanStep[] }) {
  const t = await getTranslations("Workbench");
  const done = steps.filter((s) => s.status === "done").length;
  const hasRunning = steps.some((s) => s.status === "running");

  return (
    <section className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
          {t("planHeading")}
        </h2>
        {steps.length > 0 ? (
          <StatusChip variant={hasRunning ? "running" : done === steps.length ? "success" : "neutral"}>
            {done}/{steps.length}
          </StatusChip>
        ) : null}
      </div>
      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("emptyPlanSteps")}</p>
      ) : (
        <ol className="space-y-1">
          {steps.map((step) => (
            <li
              key={step.id}
              className="flex gap-2 rounded-md px-1 py-1.5 text-sm leading-snug"
            >
              <PlanStatusIcon status={step.status} />
              <span
                className={cn(
                  "flex-1",
                  step.status === "running" && "border-l-2 border-primary pl-3 -ml-[2px]",
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PlanStatusIcon({ status }: { status: PlanStep["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="size-4 shrink-0 text-status-success-foreground" />;
  }
  if (status === "failed") {
    return <AlertCircle className="size-4 shrink-0 text-destructive" />;
  }
  if (status === "running") {
    return <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />;
  }
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />;
}
