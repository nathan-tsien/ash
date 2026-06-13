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
