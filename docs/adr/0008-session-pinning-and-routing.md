# ADR-0008: Session pinning and routing

## Status

Proposed

## Context

When `crates/ash-server` scales beyond a single process, browser clients must reach the instance that holds (or can recover) the in-process cogito `SessionHandle` for a given conversation.

Without an explicit pinning model, load balancers may route subsequent SSE reconnects or POST actions to a cold node, breaking stream continuity and tool state.

Phase 1 uses static mocks — no session affinity requirements exist yet.

## Decision

**No pinning model is locked yet.** Evaluate three patterns before Phase 2 multi-instance deployment:

| Model | Mechanism | Pros | Cons |
|-------|-----------|------|------|
| **Sticky load balancer** | Cookie or source-ip affinity to ash-server pod | Simple ops story | Uneven load; reconnect fragility if pod dies |
| **Consistent hash routing** | Hash `conversationId` (or tenant+session) at gateway | Even spread; predictable shard | Hot sessions; resharding pain on scale events |
| **External session store + any-instance dispatch** | Persist cogito event log / session metadata in shared store; any node replays | Best failover | Highest complexity; depends on cogito persistence guarantees |

**Working recommendation (non-binding):**

1. **Phase 2 single-instance dev:** no pinning — local `ash-server` only.
2. **Phase 2 staging multi-instance:** start with **consistent hash on `conversationId`** at the ingress layer, paired with ADR-0007 SSE reconnect tokens scoped to the same hash ring.
3. Revisit **external store** only if cogito exposes durable session rehydration APIs that make cross-node handoff cheap.

Document the chosen model in a superseding ADR before shipping multi-replica production configs.

## Consequences

- **Easier:** Early single-node Phase 2 avoids premature distributed systems work.
- **Harder:** Delaying pinning decisions may paint ingress into a corner if WebSocket stickiness is chosen later without hash planning.
- **Requires pairing:** Transport ADR (0007) and tenancy ADR (0009) must align on which identifier drives routing (`conversationId` vs tenant header).

## Related

- ADR-0007 — transport selection
- ADR-0009 — tenancy model
- ROADMAP.md Phase 2 — ash-server + streaming
