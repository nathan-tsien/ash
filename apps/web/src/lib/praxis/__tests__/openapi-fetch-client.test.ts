import { describe, expect, it, vi } from "vitest";
import { createPraxisFetchClient } from "../openapi-fetch-client";

describe("createPraxisFetchClient", () => {
  it("issues contract paths against the given base url", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createPraxisFetchClient({ baseUrl: "/api/praxis", fetch: fetchMock });
    await client.GET("/v1/tasks", { params: { query: { limit: 20 } } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const arg = fetchMock.mock.calls[0][0] as Request | string;
    const urlStr = typeof arg === "string" ? arg : arg.url;
    const url = new URL(urlStr, "http://x");
    expect(url.pathname).toBe("/api/praxis/v1/tasks");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("injects a bearer token when an auth resolver is supplied", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    const client = createPraxisFetchClient({
      baseUrl: "http://localhost:8091",
      fetch: fetchMock,
      getToken: async () => "tok-123",
    });
    await client.GET("/v1/tasks/{id}", { params: { path: { id: "00000000-0000-0000-0000-000000000000" } } });
    const arg = fetchMock.mock.calls[0][0] as Request | string;
    const headers = typeof arg === "string" ? new Headers((fetchMock.mock.calls[0][1] as RequestInit)?.headers) : arg.headers;
    expect(headers.get("authorization")).toBe("Bearer tok-123");
  });
});
