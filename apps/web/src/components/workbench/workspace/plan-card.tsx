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
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex gap-2 text-sm leading-snug">
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
    return <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />;
  }
  if (status === "failed") {
    return <AlertCircle className="size-4 shrink-0 text-destructive" />;
  }
  if (status === "running") {
    return <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />;
  }
  return <Circle className="size-4 shrink-0 text-muted-foreground/50" />;
}
