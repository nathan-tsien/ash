// praxis wire types — re-exported from the generated OpenAPI client.
//
// praxis 0.3.0 (ADR-0018) replaced the flat RuntimeEvent/HistoryEvent model with
// a block-oriented model: the SSE stream is a `StreamEvent` union following the
// Anthropic message-turn lifecycle, and history returns `MessagePage` of typed
// `Message` objects (each carrying `ContentBlock[]`). All of these are defined in
// the OpenAPI document, so `openapi-typescript` generates them (run
// `pnpm --filter @ash/web gen:praxis`); praxis owns the contract.

import type { components } from "./generated";

export type TaskSummary = components["schemas"]["TaskSummary"];
export type CreateTaskRequest = components["schemas"]["CreateTaskRequest"];
export type PraxisTaskStatus = components["schemas"]["TaskStatus"];
export type AnswerRequest = components["schemas"]["AnswerRequest"];

/** Block-oriented SSE event union (discriminator `type`). Replaces RuntimeEvent. */
export type StreamEvent = components["schemas"]["StreamEvent"];
/** Incremental update applied to an open content block (internally tagged). */
export type BlockDelta = components["schemas"]["BlockDelta"];
/** A typed content block (adjacent tagging: `{ type, data }`). */
export type ContentBlock = components["schemas"]["ContentBlock"];

/** praxis wire Message (block-shaped). ash's view-model Message is in @ash/shared. */
export type PraxisMessage = components["schemas"]["Message"];
/** A page of persisted Messages, newest-first; cursor `next_before_seq`. */
export type MessagePage = components["schemas"]["MessagePage"];
export type PraxisMessageRole = components["schemas"]["MessageRole"];
export type StopReason = components["schemas"]["StopReason"];
export type Usage = components["schemas"]["Usage"];
export type Attachment = components["schemas"]["Attachment"];
export type TaskList = components["schemas"]["TaskList"];

/** A registered skill descriptor (praxis 0.2.0 GET /v1/skills item). */
export type SkillSummary = components["schemas"]["ResourceDescriptor"];
/** A page of skill descriptors. */
export type SkillList = components["schemas"]["SkillList"];
