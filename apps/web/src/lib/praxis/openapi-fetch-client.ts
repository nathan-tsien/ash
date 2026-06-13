import createClient, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "./generated";

export interface PraxisFetchOptions {
  /** Browser: "/api/praxis" (same-origin BFF). Server: PRAXIS_BASE_URL (direct). */
  baseUrl: string;
  /** Server-only: resolves the iam JWT to attach as a Bearer header. */
  getToken?: () => Promise<string | null>;
  /** Injectable for tests. Defaults to global fetch. */
  fetch?: (input: Request) => Promise<Response>;
}

// Synthetic base used only when the runtime cannot construct a Request from a
// relative URL (Node / jsdom test environments). Stripped from the final URL
// before the fetch mock can observe it, but the Request object still carries a
// fully-qualified URL so the URL constructor inside openapi-fetch does not throw.
const RELATIVE_URL_BASE = "http://ash.internal";

/**
 * Returns true when the runtime's Request constructor cannot accept relative
 * URLs (Node < 18 and jsdom test environments).
 */
function runtimeRejectsRelativeUrls(): boolean {
  try {
    // eslint-disable-next-line no-new
    new Request("/probe");
    return false;
  } catch {
    return true;
  }
}

/**
 * A Request subclass that silently resolves relative URLs against
 * RELATIVE_URL_BASE so openapi-fetch never throws when baseUrl is relative
 * (e.g. "/api/praxis" in same-origin BFF mode). The injected fetch mock
 * receives a Request whose .url preserves the original path so that
 * `new URL(request.url, "http://x")` resolves correctly in tests.
 */
class RelativeSafeRequest extends Request {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const resolved =
      typeof input === "string" && input.startsWith("/")
        ? `${RELATIVE_URL_BASE}${input}`
        : input;
    super(resolved as RequestInfo | URL, init);
  }
}

/**
 * Single openapi-fetch client bound to the generated praxis `paths`. Both the
 * browser transport (via BFF) and the server transport (direct) are built from
 * this — only baseUrl + auth differ. SSE is NOT served here (openapi-fetch does
 * not consume text/event-stream); see http-client.streamEvents.
 */
export function createPraxisFetchClient(opts: PraxisFetchOptions): Client<paths> {
  // In environments that reject relative URLs (test/Node) we supply a safe
  // Request subclass. In real browsers this path is never taken.
  const RequestImpl = runtimeRejectsRelativeUrls()
    ? RelativeSafeRequest
    : globalThis.Request;

  const client = createClient<paths>({
    baseUrl: opts.baseUrl,
    fetch: opts.fetch,
    // Cast: openapi-fetch accepts `typeof Request` for DI; our subclass is compatible.
    Request: RequestImpl as typeof Request,
  });

  if (opts.getToken) {
    const auth: Middleware = {
      async onRequest({ request }) {
        const token = await opts.getToken!();
        if (token) request.headers.set("authorization", `Bearer ${token}`);
        return request;
      },
    };
    client.use(auth);
  }
  return client;
}
