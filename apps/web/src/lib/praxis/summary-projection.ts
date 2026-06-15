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
 *
 * NOTE on timestamps: praxis TaskSummary carries no created/updated time, so
 * `createdAt` == `updatedAt` == the caller's request time (`labels.ts`). This
 * is a SYNTHETIC stamp, identical for every card in a single list fetch.
 * Consumers MUST NOT present it as real activity time (a uniform relative
 * string like "just now" on every row is misleading and makes the list look
 * shuffled): the sidebar drives its secondary line off the status label
 * instead. Long-term fix (contract-first, see MEMORY): add `updated_at` to the
 * praxis TaskSummary OpenAPI schema and regenerate — never hand-edit
 * generated.ts.
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
