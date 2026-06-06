// praxis wire types.
//
// REST shapes (TaskSummary / CreateTaskRequest / TaskStatus) are re-exported from
// `generated.ts`, which is produced from the praxis OpenAPI v0.1.0 by
// `openapi-typescript` (run `pnpm --filter @ash/web gen:praxis`). praxis owns the
// contract; regenerate when it revises.
//
// `RuntimeEvent` is NOT expressed in the OpenAPI document — the `/v1/tasks/{id}/events`
// response is typed `text/event-stream` (string), and the variant set lives in praxis
// `crates/praxis-protocol/src/traits.rs` (`enum RuntimeEvent`,
// `#[serde(tag = "type", rename_all = "snake_case")]`) + ADR-0008. It is therefore
// mirrored here by hand. Keep in sync when praxis revises the contract.

import type { components } from "./generated";

export type TaskSummary = components["schemas"]["TaskSummary"];
export type CreateTaskRequest = components["schemas"]["CreateTaskRequest"];
export type PraxisTaskStatus = components["schemas"]["TaskStatus"];

/** SSE runtime event stream (tagged union on `type`, snake_case). 11 variants. */
export type RuntimeEvent =
  | { type: "turn_started" }
  | { type: "turn_paused" }
  | { type: "turn_resumed" }
  | { type: "turn_cancelled" }
  | { type: "turn_completed" }
  | { type: "turn_failed"; reason: string }
  | { type: "text_delta"; chunk: string }
  | { type: "thinking_delta"; chunk: string }
  | { type: "skill_activation_requested"; skill_name: string }
  | { type: "tool_dispatch_started"; call_id: string; tool_name: string; args: unknown }
  | { type: "tool_dispatch_ended"; call_id: string; ok: boolean; error_message?: string | null };
