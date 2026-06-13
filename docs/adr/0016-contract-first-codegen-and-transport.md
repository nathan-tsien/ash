# ADR-0016: Contract-first codegen and transport alignment

## Status

Accepted (2026-06-13)

Supersedes ADR-0011 §5 (multi-turn follow-up deferred) and ADR-0015 §4/§6 (deep-link cold load
deferred). Revises ADR-0012 §2 (BFF proxy path-rewriting scheme).

## Context

ash is pre-release. The codebase already has a live praxis transport (ADR-0012) and interactive
execution (ADR-0015), but the HTTP control-plane calls in `httpPraxisClient` were hand-written
wrappers — not bound to the generated `paths` type exported by `openapi-typescript`. Path strings,
query-parameter names, and request-body shapes were not checked at compile time.

Two principles drove this slice:

1. **All API access must be generated from the OpenAPI contract.** The contract (`openapi/praxis.yaml`
   + `openapi/schemas.json`) is the single source of truth; no hand-written URL strings or parameter
   maps that could silently drift.
2. **praxis is a private repo.** A public raw-URL codegen approach — used successfully for
   `@ash/iam-client` — is not usable here; `gh` authentication is required to read the contract.
   This shapes every part of the sync and CI workflow.

The same slice also completed the remaining deferred capabilities: task list
(`GET /v1/tasks`), deep-link cold load (`GET /v1/tasks/{id}` + provider seed), cancel
(`POST /v1/tasks/{id}/cancel`), and multi-turn follow-up (`POST /v1/tasks/{id}/messages`).

## Decision

### 1. Contract source: authenticated gh-based sync + CI drift check

`apps/web/scripts/sync-praxis-contract.sh` pulls `openapi/praxis.yaml` and `openapi/schemas.json`
at a pinned tag (default `openapi-v0.1.5`) from `github.com/nathan-tsien/praxis` via
`gh api ... -H "Accept: application/vnd.github.raw"`. The fetched files are committed into
`apps/web/src/lib/praxis/contract/` (the vendored snapshot).

Four scripts are declared in `apps/web/package.json`:

- `sync:praxis` — pull the pinned tag, overwrite the vendored snapshot (requires `gh` auth).
- `sync:praxis:check` — diff the vendored snapshot against the tag without writing (requires `gh`
  auth; manual/periodic — not in default CI because it needs authenticated access to the private repo).
- `gen:praxis` — run `openapi-typescript` on the vendored snapshot, producing `generated.ts`
  (offline, no auth needed; idempotent).
- `gen:praxis:check` — run `gen:praxis` then `git diff --exit-code` on `generated.ts`; fails on
  any drift between the committed client and the vendored contract. This step runs in CI after
  install.

The vendored snapshot is byte-identical to tag `openapi-v0.1.5`.

### 2. Typed transport: one openapi-fetch factory; SSE is the single hand-written exception

`apps/web/src/lib/praxis/openapi-fetch-client.ts` exports `createPraxisFetchClient(opts)`, which
returns a `Client<paths>` from `openapi-fetch` bound to the generated `paths` type. Both transports
are built from this factory; only `baseUrl` and `getToken` differ:

- Browser transport (`http-client.ts`): `baseUrl: "/api/praxis"`, no `getToken` (the httpOnly
  iam cookie rides the request automatically).
- Server transport (`server/praxis-client.ts`): `baseUrl: PRAXIS_BASE_URL`, `getToken:
  getAccessTokenWithRefresh` (attaches the JWT as a Bearer header).

Every non-SSE praxis call goes through this factory. Path strings, path parameters, query
parameters, and request-body shapes are validated by TypeScript against the generated `paths` type
at compile time.

`streamEvents` is the **single hand-written exception**: `openapi-fetch` cannot consume
`text/event-stream`. The method reads the SSE body with a `ReadableStream` loop and yields the
generated `RuntimeEvent` union. The carve-out is documented in both `http-client.ts` and this ADR.

### 3. Transparent BFF: contract paths line up 1:1

The BFF catch-all at `app/api/praxis/[...segments]/route.ts` previously mapped
`/api/praxis/tasks/...` to `PRAXIS_BASE_URL/v1/tasks/...` (an implicit path-rewriting scheme, per
ADR-0012 §2). This is revised: the BFF is now a **transparent forwarder**. Segments captured by
`[...segments]` are forwarded verbatim:

```
/api/praxis/v1/tasks/{id}/events  →  PRAXIS_BASE_URL/v1/tasks/{id}/events
```

The allowlist is rekeyed: `segments[0] === "v1" && segments[1] === "tasks"` (was
`segments[0] === "tasks"`). Paths line up 1:1 between the browser client's contract paths and
praxis's actual endpoints — no implicit prefix rewriting on either side.

### 4. RSC direct, no CORS

Server Components (`server/tasks.ts`) call praxis directly server-to-server via
`server/praxis-client.ts`, which uses the same `createPraxisFetchClient` factory with the direct
`PRAXIS_BASE_URL`. CORS is enforced by browsers only; server-to-server calls are not subject to it,
so no praxis CORS configuration is required in development or production.

`server/praxis-client.ts` carries `import "server-only"` at the top, ensuring the direct client
can never be bundled into the browser bundle (Next.js will throw a build error if it is imported
from a client module).

## Consequences

- **Easier:** path strings, query-parameter names, and request-body shapes are now checked at
  compile time via the generated `paths` type. Typos in endpoint paths and parameter shapes become
  build errors rather than runtime bugs.
- **Drift is a CI failure.** `gen:praxis:check` fails if `generated.ts` does not match the
  vendored contract; the vendored contract can be re-synced manually via `sync:praxis` when a new
  praxis tag is published.
- **One documented SSE carve-out.** `streamEvents` is hand-written but still consumes the
  generated `RuntimeEvent` union; any change to `RuntimeEvent` in the contract will still surface
  as a type error.
- **Contract sync requires `gh`.** `sync:praxis` and `sync:praxis:check` require an authenticated
  `gh` CLI against the private repo. This is documented in the sync script header. CI runs only
  the `gen:praxis:check` step (no auth needed), so the pull-request gate is fully automatable.
- **Projects remain out of scope.** The allowlist covers `v1/tasks` only; `v1/projects` must be
  added deliberately when Project live execution is scheduled.

## Alternatives considered

1. **Keep hand-written fetch wrappers** — rejected; violates the codegen principle (path strings
   and param shapes are not contract-bound).
2. **Public raw URL in package.json** (as `@ash/iam-client` uses) — not feasible; praxis is a
   private repo and a raw URL requires a token embedded in configuration, which is not acceptable
   for a shared development setup.
3. **openapi-fetch for SSE** — not possible; `openapi-fetch` does not support `text/event-stream`
   response bodies.

## Related

- `docs/superpowers/specs/2026-06-13-praxis-task-lifecycle.md` (source of truth for this slice)
- ADR-0007 (transport = SSE), ADR-0011 (praxis contract + one-shot model), ADR-0012 (live
  transport; BFF SSE proxy), ADR-0015 (interactive execution; generated event unions)
- `apps/web/scripts/sync-praxis-contract.sh` (sync implementation)
- `apps/web/src/lib/praxis/openapi-fetch-client.ts` (factory)
- `apps/web/src/server/praxis-client.ts` (server-direct client)
- praxis `github.com/nathan-tsien/praxis`, tag `openapi-v0.1.5`
