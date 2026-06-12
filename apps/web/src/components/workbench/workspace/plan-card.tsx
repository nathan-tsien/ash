import type { PlanStep } from "@ash/shared";
import { cn } from "@ash/ui/lib/utils";
import { AlertCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function PlanCard({ steps }: { steps: PlanStep[] }) {
  const t = await getTranslations("Workbench");

  return (
    <div className="space-y-2">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("planHeading")}
      </h2>
      <ol className="space-y-1 rounded-lg bg-muted/30 p-2">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className={cn(
              "flex gap-2 rounded-md px-2 py-1.5 text-sm leading-snug",
              i % 2 === 0 && "bg-muted/40",
            )}
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
    </div>
  );
}

function PlanStatusIcon({ status }: { status: PlanStep["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="size-4 shrink-0 text-status-success" />;
  }
  if (status === "failed") {
    return <AlertCircle className="size-4 shrink-0 text-destructive" />;
  }
  if (status === "running") {
    return <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />;
  }
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />;
}
