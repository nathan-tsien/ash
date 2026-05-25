# ADR-0007: Transport selection — SSE versus WebSocket versus long-polling

## Status

Proposed

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
