import type { TaskStatus } from "@ash/shared";
import type { PraxisTaskStatus } from "./runtime-events";

/**
 * praxis lifecycle states -> ash view-model status. ash has no `paused`
 * (treated as running) and no `cancelled` (a terminal non-success -> `failed`).
 * Centralized so list/get projection and the stream_end reducer agree.
 */
export function praxisToAshStatus(status: PraxisTaskStatus): TaskStatus {
  switch (status) {
    case "draft":
      return "pending";
    case "running":
    case "paused":
      return "running";
    case "awaiting_input":
      return "awaiting_input";
    case "completed":
      return "completed";
    case "failed":
    case "cancelled":
      return "failed";
  }
}
