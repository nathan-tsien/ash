import type { CreateTaskRequest, RuntimeEvent, TaskSummary } from "./runtime-events";
import { fakePraxisClient } from "./fake-client";

/**
 * Consumer-facing praxis task client. Its shape mirrors the praxis REST + SSE
 * contract (see `contract/praxis.yaml`), so swapping the fake for the real
 * transport changes the implementation only — UI consumers are unchanged.
 */
export interface PraxisTaskClient {
  /** POST /v1/tasks */
  createTask(req: CreateTaskRequest): Promise<TaskSummary>;
  /** POST /v1/tasks/{id}/start */
  startTask(id: string, userInput: string): Promise<TaskSummary>;
  /** GET /v1/tasks/{id}/events (SSE) — yields RuntimeEvents until the turn ends */
  streamEvents(id: string): AsyncIterable<RuntimeEvent>;
  /** POST /v1/tasks/{id}/messages */
  sendMessage(id: string, text: string): Promise<void>;
  /** POST /v1/tasks/{id}/complete */
  complete(id: string): Promise<void>;
  /** POST /v1/tasks/{id}/cancel */
  cancel(id: string): Promise<void>;
}

/**
 * Returns the active praxis client. Default = fake (this slice ships no real
 * network/SSE transport). The real `httpPraxisClient` needs a BFF SSE proxy
 * route and stays gated until the streaming slice (docs/adr/0007).
 */
export function getPraxisClient(): PraxisTaskClient {
  return fakePraxisClient;
}
