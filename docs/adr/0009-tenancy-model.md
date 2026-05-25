# ADR-0009: Tenancy model

## Status

Proposed

## Context

ash is a product shell that will eventually serve authenticated organizations (SSO, quotas, audit). cogito remains tenant-agnostic at the runtime layer; ash-server must decide how tenant identity flows from the browser through HTTP to in-process session creation.

Phase 1 ships no auth — mocks are global. Introducing tenancy without an ADR risks ad-hoc header names and broken isolation stories.

## Decision

**No tenancy model is locked yet.** Three tiers are under consideration:

| Tier | Description | When appropriate |
|------|-------------|------------------|
| **Single-tenant / dev** | One implicit org; no auth headers | Local dev, early dogfood |
| **Multi-tenant via request context** | SSO (OIDC) → ash issues session cookie; ash-server reads verified tenant + user claims from middleware-injected context | Default SaaS posture |
| **Hard multi-instance isolation** | Separate ash-server deployments per enterprise customer | Regulated customers; air-gapped installs |

**Working recommendation (non-binding):**

1. Phase 2 begins **single-tenant dev** with explicit `TODO(ash-auth)` seams in ash-server middleware.
2. Before external beta, adopt **multi-tenant via request context** — tenant id derived from verified OIDC claims, never from unauthenticated client-supplied headers alone.
3. Defer **hard isolation** until a paying customer contract requires it; document as a deployment variant, not the default code path.

Cross-cutting rules (apply regardless of tier):

- Browser bundles never embed cogito or hold runtime secrets (ADR-0002).
- Tenant identifiers must propagate consistently through session creation, SSE subscribe, and quota counters.
- `packages/shared` types remain scaffolding until OpenAPI/event schemas freeze — do not treat TS mocks as tenancy source of truth.

## Consequences

- **Easier:** Phased rollout — mocks today, verified claims tomorrow.
- **Harder:** Middleware + adapter work in ash-server before SSO UI ships; requires security review gate.
- **Ordering dependency:** Accept tenancy ADR before implementing auth routes, tenant-scoped conversation catalogs, or billing hooks.

## Related

- ADR-0002 — ash/cogito boundary
- ADR-0006 — data adapter seam (client adapters gain auth headers in Phase 2)
- ADR-0008 — session pinning (routing key may include tenant id)
- ROADMAP.md Phase 2 — auth posture explicitly deferred from Phase 1
