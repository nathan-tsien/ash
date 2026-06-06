import type { PraxisTaskClient } from "./client";
import type { RuntimeEvent } from "./runtime-events";

/**
 * Scaffold for the real praxis transport. NOT enabled this slice.
 *
 * The SSE path (`GET /v1/tasks/{id}/events`) requires a BFF proxy route
 * (`/api/praxis/...`) that forwards the iam JWT and re-streams praxis's
 * `text/event-stream` to the browser. That route is the gated Phase 2 piece
 * (docs/adr/0007, praxis ADR-0008). Methods throw to prevent accidental use
 * before the streaming slice wires the proxy + auth header propagation.
 */
const NOT_ENABLED = "praxis http client not enabled this slice (see docs/adr/0007)";

export const httpPraxisClient: PraxisTaskClient = {
  async createTask() {
    throw new Error(NOT_ENABLED);
  },
  async startTask() {
    throw new Error(NOT_ENABLED);
  },
  // Scaffold; the real impl yields parsed SSE RuntimeEvents.
  async *streamEvents(): AsyncIterable<RuntimeEvent> {
    throw new Error(NOT_ENABLED);
  },
  async sendMessage() {
    throw new Error(NOT_ENABLED);
  },
  async complete() {
    throw new Error(NOT_ENABLED);
  },
  async cancel() {
    throw new Error(NOT_ENABLED);
  },
};
