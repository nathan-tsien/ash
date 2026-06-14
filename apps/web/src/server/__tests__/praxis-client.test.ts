import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// praxis-client imports "server-only" (throws outside a server bundle); stub it.
vi.mock("server-only", () => ({}));

// The server-component praxis client must resolve its bearer token WITHOUT
// triggering a refresh, because refresh writes cookies and cookie mutation is
// illegal during a React Server Component render ("Cookies can only be modified
// in a Server Action or Route Handler"). Refresh belongs to route handlers
// (the BFF forwardToPraxis, /api/auth/me, /api/auth/refresh).
const { getAccessToken, getAccessTokenWithRefresh, refreshAccessToken } = vi.hoisted(() => ({
  getAccessToken: vi.fn(async () => "read-only-token"),
  getAccessTokenWithRefresh: vi.fn(async () => "refreshed-token"),
  refreshAccessToken: vi.fn(async () => null),
}));
vi.mock("../auth", () => ({ getAccessToken, getAccessTokenWithRefresh, refreshAccessToken }));

import { serverPraxisClient } from "../praxis-client";

describe("serverPraxisClient token resolution", () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    getAccessToken.mockClear();
    getAccessTokenWithRefresh.mockClear();
    refreshAccessToken.mockClear();
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("attaches the read-only access token and never triggers a cookie-writing refresh", async () => {
    let authorization: string | null = null;
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      authorization = (input as Request).headers.get("authorization");
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const client = serverPraxisClient();
    const { data } = await client.GET("/v1/tasks", { params: { query: { limit: 50 } } });

    expect(authorization).toBe("Bearer read-only-token");
    expect(getAccessToken).toHaveBeenCalled();
    // The refreshing getters write cookies — they must NOT run in RSC render.
    expect(getAccessTokenWithRefresh).not.toHaveBeenCalled();
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(data).toEqual({ items: [] });
  });
});
