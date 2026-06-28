"use client";

import type { AshLocale, Task } from "@ash/shared";
import { processEvents } from "@ash/shared";
import { ScrollArea } from "@ash/ui/scroll-area";
import { StatusChip } from "@ash/ui/status-chip";
import { cn } from "@ash/ui/lib/utils";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ASK_USER_TOOL } from "@/lib/praxis/block-fold";
import { ProcessTab } from "./process-tab";
import { DeliverablesTab } from "./deliverables-tab";

type Tab = "process" | "deliverables";

export interface TaskWorkspaceProps {
  locale: AshLocale;
  task: Task;
  onSelectMessage?: (messageId: string) => void;
}

export function TaskWorkspace({ locale, task, onSelectMessage }: TaskWorkspaceProps) {
  const t = useTranslations("Workbench");
  const [tab, setTab] = useState<Tab>("process");

  const done =
    task.status === "completed"
      ? { status: "success" as const, at: task.completedAt ?? task.updatedAt, label: t("processDone") }
      : task.status === "failed"
        ? { status: "error" as const, at: task.updatedAt, label: t("processDone") }
        : undefined;
  const events = processEvents(task.messages, { askToolName: ASK_USER_TOOL, done });
  const deliverables = task.deliverables;

  return (
    <aside className="flex w-workspace shrink-0 flex-col border-l border-border bg-workspace">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-body-sm font-semibold">{t("workspaceTitle")}</span>
      </div>

      {/* Tab switcher */}
      <div role="tablist" className="flex items-center gap-1 border-b border-border px-3 py-2">
        <TabButton active={tab === "process"} onClick={() => setTab("process")}>
          {t("tabProcess")}
        </TabButton>
        <TabButton active={tab === "deliverables"} onClick={() => setTab("deliverables")}>
          <span className="flex items-center gap-1.5">
            {t("tabDeliverables")}
            {deliverables.length > 0 ? <StatusChip variant="success">{deliverables.length}</StatusChip> : null}
          </span>
        </TabButton>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {tab === "process" ? (
            <ProcessTab events={events} onSelect={onSelectMessage} />
          ) : (
            <DeliverablesTab locale={locale} deliverables={deliverables} />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
