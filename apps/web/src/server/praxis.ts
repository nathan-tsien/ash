import "server-only";

import { getAccessTokenWithRefresh } from "./auth";

/** praxis HTTP base URL. Server-only; distinct default from iam's 8090. */
const PRAXIS_BASE_URL = process.env.PRAXIS_BASE_URL ?? "http://localhost:8091";

/** Only `/v1/tasks/**` is proxied. Keeps this from being an open proxy. */
const ALLOWED = (segments: string[]) => segments[0] === "v1" && segments[1] === "tasks";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Forward a browser request to praxis, attaching the iam JWT from the httpOnly
 * cookie as a Bearer header. Control-plane responses pass through (status +
 * JSON body); the SSE `/events` response body is piped straight back.
 *
 * Speaks HTTP only — does not import cogito or any praxis Rust crate.
 */
export async function forwardToPraxis(request: Request, segments: string[]): Promise<Response> {
  if (!ALLOWED(segments)) {
    return json({ error: "not_found" }, 404);
  }

  const token = await getAccessTokenWithRefresh();
  if (!token) {
    return json({ error: "unauthenticated" }, 401);
  }

  const isSse = segments[segments.length - 1] === "events";
  // Preserve the query string (e.g. /history's ?cursor=...): the catch-all route
  // captures path segments only, so the search must be carried over explicitly.
  const search = new URL(request.url).search;
  // Segments already include "v1" (e.g. ["v1","tasks","t1"]); forward transparently
  // so the browser client's contract paths reach praxis without double-prefixing.
  const url = `${PRAXIS_BASE_URL}/${segments.join("/")}${search}`;
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  const init: RequestInit = { method: request.method, headers, signal: request.signal };

  if (request.method === "POST") {
    headers["content-type"] = "application/json";
    const body = await request.text();
    if (body) init.body = body;
  }
  if (isSse) headers["accept"] = "text/event-stream";

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    // The browser aborting (navigation / provider unmount) aborts request.signal,
    // which rejects this fetch. That is a benign cancellation — return a quiet
    // client-closed status, not an unhandled 500. A genuine connect failure
    // (praxis down) becomes a 502 the client surfaces as a failed task.
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return json({ error: "praxis_unreachable" }, 502);
  }

  if (isSse) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  }

  // Control plane: pass status + body through. 204/empty bodies stay empty.
  const text = await upstream.text();
  return new Response(text || null, {
    status: upstream.status,
    headers: text ? { "content-type": "application/json" } : {},
  });
}
