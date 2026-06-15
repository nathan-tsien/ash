import type { CreateTaskRequest, RuntimeEvent, SkillList, TaskHistoryPage, TaskList, TaskSummary } from "./runtime-events";
import { httpPraxisClient } from "./http-client";

/**
 * Consumer-facing praxis task client. Its shape mirrors the praxis REST + SSE
 * contract (see `contract/praxis.yaml`), so swapping the fake for the real
 * transport changes the implementation only — UI consumers are unchanged.
 */
export interface PraxisTaskClient {
  /** POST /v1/tasks */
  createTask(req: CreateTaskRequest): Promise<TaskSummary>;
  /** POST /v1/tasks/{id}/start. `skillHints` are sent as `skill_hints` (hints, not locks). */
  startTask(id: string, userInput: string, skillHints?: string[]): Promise<TaskSummary>;
  /** GET /v1/skills — one page of registered skills usable as hints. */
  listSkills(params?: { limit?: number; cursor?: string }): Promise<SkillList>;
  /** GET /v1/tasks/{id}/events (SSE) — yields RuntimeEvents until the turn ends */
  streamEvents(id: string, signal?: AbortSignal): AsyncIterable<RuntimeEvent>;
  /** POST /v1/tasks/{id}/messages */
  sendMessage(id: string, text: string): Promise<void>;
  /** POST /v1/tasks/{id}/answers — answer a pending ask_user question. */
  answer(id: string, askId: string, answer: string): Promise<void>;
  /** GET /v1/tasks — one page of the caller's tasks (newest-first). */
  listTasks(params?: { limit?: number; cursor?: string }): Promise<TaskList>;
  /** GET /v1/tasks/{id} — fetch a single task summary (deep-link cold load). */
  getTask(id: string): Promise<TaskSummary>;
  /** GET /v1/tasks/{id}/history — one page of historical events, newest-first. */
  history(id: string, cursor?: string): Promise<TaskHistoryPage>;
  /** POST /v1/tasks/{id}/complete */
  complete(id: string): Promise<void>;
  /** POST /v1/tasks/{id}/cancel */
  cancel(id: string): Promise<void>;
}

/**
 * Returns the active praxis client. ALWAYS the real transport (browser → BFF →
 * praxis, ADR-0012).
 *
 * Discipline: the fake/mock client (`fakePraxisClient`) may be used ONLY in the
 * unit-test phase — its tests import it directly, and component tests mock this
 * module's `getPraxisClient`. It is never selected at runtime and is not
 * referenced here, so it cannot leak into dev or prod. (This supersedes the
 * former NEXT_PUBLIC_PRAXIS_TRANSPORT=fake default; see AGENTS.md.)
 */
export function getPraxisClient(): PraxisTaskClient {
  return httpPraxisClient;
}
