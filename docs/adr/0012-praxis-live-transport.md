# ADR-0012: Real praxis transport and the BFF SSE proxy

## Status

Accepted (2026-06-06)

## Context

ADR-0011 shipped the praxis execution pipeline (client interface, reducer, provider, UI) driven by a local
fake, and explicitly deferred the real transport: the `httpPraxisClient` and the BFF SSE proxy route that
ADR-0007 identified as the gated Phase 2 piece. This ADR records the decisions for that real-transport slice
(`docs/superpowers/specs/2026-06-06-praxis-live-transport.md`).

The shaping constraint: the iam access token lives in an httpOnly cookie (`server/auth.ts`), so browser
JavaScript cannot attach `Authorization: Bearer` to any praxis request — not only the SSE stream ADR-0007
called out, but the control-plane POSTs too.

## Decision

1. **Proxy everything through a same-origin BFF.** Every browser-to-praxis call goes to `/api/praxis/...`;
   the browser fetch carries the httpOnly cookie automatically, and the route reads it, attaches the Bearer
   header, and forwards to praxis. The JWT never reaches browser-readable storage.

2. **One catch-all route with a `tasks/` allowlist.** A single `app/api/praxis/[...segments]/route.ts`
   (`GET` + `POST`) forwards any method/body, keeping the swap to real praxis mechanical. It rejects any
   path whose first segment is not `tasks`, so it is not an open proxy. Logic lives in `server/praxis.ts`
   (`forwardToPraxis`, `PRAXIS_BASE_URL` default `http://localhost:8091`); the route file stays thin.

3. **Pipe the SSE body through; parse on the client.** For `/events` the route returns the upstream
   `text/event-stream` body unbuffered. `httpPraxisClient` parses frames with an incremental `SseParser`
   (fetch + ReadableStream, not `EventSource` — abortable, no auto-reconnect, fits the `AsyncIterable`).

4. **Env-flag selection, fake stays default.** `getPraxisClient()` returns `httpPraxisClient` only when
   `NEXT_PUBLIC_PRAXIS_TRANSPORT=http`; otherwise the fake. Nothing in dev/CI changes until someone opts in.

5. **Build-to-contract.** No deployed praxis exists yet, so correctness rests on the OpenAPI contract plus
   unit tests (SSE parser, client with mocked fetch, proxy with mocked upstream). Live end-to-end is
   deferred.

6. **No reconnection this slice.** A dropped stream surfaces as a failed task; `Last-Event-ID` resume and a
   replay buffer are deferred.

7. **AbortSignal plumbing.** `streamEvents(id, signal?)` threads an `AbortController` from
   `TaskRunProvider` so an abandoned real SSE connection is torn down on unmount. The fake ignores it.

## Consequences

- **Easier:** Pointing ash at a real praxis is `NEXT_PUBLIC_PRAXIS_TRANSPORT=http` + `PRAXIS_BASE_URL`; the
  reducer, provider, and UI are untouched.
- **Boundary preserved:** the proxy speaks HTTP only — no cogito/praxis-crate import enters `apps/web`.
- **Surface to watch:** the catch-all is mitigated by the `tasks/` allowlist; widen deliberately (e.g.
  `projects/`) if more namespaces are proxied.
- **Deferred:** live verification, SSE reconnection/resume, server-side run persistence, Project live
  execution, single-Task multi-turn UI.

## Related

- `docs/superpowers/specs/2026-06-06-praxis-live-transport.md`
- ADR-0007 (transport = SSE; this lands its gated proxy), ADR-0011 (praxis contract + fake slice)
- praxis ADR-0008 (cogito runtime integration, RuntimeEvent + task FSM)
