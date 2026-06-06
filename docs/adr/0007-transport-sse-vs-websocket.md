# ADR-0007: Transport selection — SSE versus WebSocket versus long-polling

## Status

Accepted (2026-06-03). The working recommendation below is now the decision, settled by the upstream
praxis contract.

## Update (2026-06-03) — decision locked to SSE

praxis published its HTTP contract (`openapi/praxis.yaml` v0.1.0) and **praxis ADR-0008** which fix the
transport on the producer side: `GET /v1/tasks/{id}/events` is **SSE** (`text/event-stream`) carrying a
JSON `RuntimeEvent` tagged union, with `POST /v1/tasks/{id}/start|messages|cancel|complete` as the
control plane. ash therefore adopts **SSE for transcript/event fan-out + HTTP POST for control**, matching
the working recommendation in this ADR and the praxis API exactly.

Consumption seam: the browser cannot attach the iam `Authorization: Bearer` header to `EventSource`, so the
real client connects to an ash **BFF proxy route** (`/api/praxis/tasks/:id/events`) that opens the praxis
SSE stream server-side with the forwarded JWT and re-streams it. That proxy route is the gated Phase 2
piece; the first live slice
(`docs/superpowers/specs/2026-06-03-task-live-execution.md`, ADR-0011) ships only the consumer interface +
a local fake and **does not** implement the SSE route yet.

## Update (2026-06-06) — BFF SSE proxy landed

The gated proxy route is now implemented (ADR-0012): a same-origin catch-all `/api/praxis/[...segments]`
forwards the iam JWT and re-streams praxis's `text/event-stream`. Still SSE + POST control plane, exactly as
locked here.

## Context

Phase 2 introduces `crates/ash-server` embedding cogito and exposing live agent output to `apps/web`. cogito exposes session-scoped event streams (for example via `SessionHandle::subscribe`) that ash must bridge to browser clients.

Transport choice affects:

- CDN and reverse-proxy compatibility
- Reconnection and resume semantics after tab sleep or network blips
- Bidirectional needs (user cancel, tool approval) versus mostly server-to-client transcript deltas
- Operational complexity (connection stickiness, idle timeouts, auth header propagation)

Phase 1 deliberately ships no live transports (startup spec + ROADMAP Phase 2 gate).

## Decision

**No transport is locked yet.** This ADR frames the evaluation matrix maintainers must resolve before Phase 2 implementation begins.

| Option | Fit for cogito transcript deltas | CDN / proxy friendliness | Bidirectional control | Reconnect story |
|--------|----------------------------------|--------------------------|----------------------|-----------------|
| **SSE** (`text/event-stream`) | Strong — unidirectional server push matches subscribe semantics | Good on HTTP/1.1+ with careful buffering headers | Weak — needs separate POST for cancel/approve | `Last-Event-ID` + server replay buffer |
| **WebSocket** | Strong — full duplex | Mixed — some proxies require sticky sessions or WS upgrades | Strong | Custom heartbeat + session resume token |
| **Long-polling** | Adequate for low-frequency mocks | Excellent | Moderate | Polling cursors |

**Working recommendation (non-binding):** prefer **SSE for transcript/event fan-out** as the primary stream, with **HTTP POST** (or a secondary WebSocket channel) for control-plane actions (cancel run, approve tool). Rationale:

1. Aligns with typical "subscribe to event log" semantics without forcing full duplex for chat rendering.
2. Simpler to secure behind standard HTTPS ingress and auth middleware.
3. Matches common browser EventSource reconnect behavior.

Supersede this ADR when a concrete spike against cogito's exported subscribe API proves otherwise.

## Consequences

- **Easier:** Phase 2 planning can proceed with a default direction while leaving room to pivot after cogito integration spikes.
- **Harder:** Dual-channel (SSE + POST) adds adapter surface area versus a single WebSocket.
- **Blocked until accepted:** Implementing production streaming endpoints, SSE route handlers, or WebSocket servers in this repository.

## Related

- ADR-0002 — ash/cogito boundary
- ADR-0008 — session pinning (transport choice interacts with stickiness)
- [cogito](https://github.com/nathan-tsien/cogito) — authoritative Harness / subscribe contracts
