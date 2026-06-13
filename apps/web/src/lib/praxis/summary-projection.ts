import type { Task } from "@ash/shared";
import type { TaskSummary } from "./runtime-events";
import { praxisToAshStatus } from "./status-map";

export interface SummaryLabels {
  /** Caller-supplied timestamp (ts unavailable in scripts; inject from RSC/now). */
  ts: string;
  /** Label when the summary has no title. */
  untitled: string;
}

/**
 * Project a praxis TaskSummary (from list/get) into ash's Task view-model as a
 * CARD: identity + status only, with empty conversation/artifact/tool arrays.
 * Full hydration (messages, tools, artifacts) comes from /history projection
 * when a task detail view mounts. Pure + deterministic.
 */
export function summaryToTask(summary: TaskSummary, labels: SummaryLabels): Task {
  return {
    id: summary.id,
    title: summary.title ?? labels.untitled,
    description: "",
    status: praxisToAshStatus(summary.status),
    createdAt: labels.ts,
    updatedAt: labels.ts,
    projectId: summary.project_id ?? undefined,
    messages: [],
    artifacts: [],
    toolTraces: [],
  };
}
