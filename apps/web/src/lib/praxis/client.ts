import type { CreateTaskRequest, RuntimeEvent, TaskSummary } from "./runtime-events";
import { fakePraxisClient } from "./fake-client";
import { httpPraxisClient } from "./http-client";

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
  streamEvents(id: string, signal?: AbortSignal): AsyncIterable<RuntimeEvent>;
  /** POST /v1/tasks/{id}/messages */
  sendMessage(id: string, text: string): Promise<void>;
  /** POST /v1/tasks/{id}/complete */
  complete(id: string): Promise<void>;
  /** POST /v1/tasks/{id}/cancel */
  cancel(id: string): Promise<void>;
}

/**
 * Returns the active praxis client. Default = fake. Set
 * NEXT_PUBLIC_PRAXIS_TRANSPORT=http to run against a real praxis through the BFF
 * proxy (ADR-0012). The flag is NEXT_PUBLIC_ because the client is constructed
 * in the browser (TaskRunProvider).
 */
export function getPraxisClient(): PraxisTaskClient {
  return process.env.NEXT_PUBLIC_PRAXIS_TRANSPORT === "http" ? httpPraxisClient : fakePraxisClient;
}
