import type { TaskStatus } from "@ash/shared";
import type { StatusDotProps } from "@ash/ui/status-dot";

// Maps the @ash/shared TaskStatus domain union onto the presentation-only
// StatusDot variants (UX-7). Kept app-side so packages/ui never imports
// domain types.
export function taskStatusDotVariant(
  status: TaskStatus,
): NonNullable<StatusDotProps["status"]> {
  switch (status) {
    case "running":
    case "awaiting_input":
      return "running";
    case "completed":
      return "success";
    case "failed":
      return "error";
    default:
      return "idle";
  }
}

// Deterministic bucket priority for ordering a task list: active/attention
// work surfaces first, failures stay visible above the finished pile, so the
// list never looks shuffled (PRIN-1). Shared by both session and server tasks.
// Lower rank sorts earlier.
export function taskStatusSortRank(status: TaskStatus): number {
  switch (status) {
    case "awaiting_input":
      return 0;
    case "running":
      return 1;
    case "pending":
      return 2;
    case "failed":
      return 3;
    case "completed":
      return 4;
    default:
      return 5;
  }
}

// Whether a status should be surfaced as a live animated StatusDot rather than
// a static chip. Only in-flight work pulses (MOTION discipline: motion signals
// liveness, not decoration); everything else reads as a calm token chip.
export function taskStatusIsLive(status: TaskStatus): boolean {
  return status === "running";
}

// Soft chip class for a settled (non-live) status, built only from COLOR-3
// status token triplets — no raw palette literals (COLOR-2). Returns the
// background + foreground pair; awaiting_input borrows the warning triplet
// since it is an attention state, not an error.
export function taskStatusChipClass(status: TaskStatus): string {
  switch (status) {
    case "awaiting_input":
      return "bg-status-warning-soft text-status-warning-foreground";
    case "completed":
      return "bg-status-success-soft text-status-success-foreground";
    case "failed":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// Workbench-namespace message key for the sr-only status label next to the
// (decorative) dot, since the dot is the only status carrier in those rows.
export function taskStatusLabelKey(
  status: TaskStatus,
): "running" | "awaitingInput" | "completed" | "failed" | "pending" {
  switch (status) {
    case "running":
      return "running";
    case "awaiting_input":
      return "awaitingInput";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}
