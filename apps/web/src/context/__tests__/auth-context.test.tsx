import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthProvider, useAuth } from "../auth-context";

function Probe() {
  const { status, user } = useAuth();
  return <div data-testid="probe">{`${status}:${user?.email ?? "none"}`}</div>;
}

function mockFetch(handler: (url: string, init?: RequestInit) => Partial<Response> & { jsonBody?: unknown }) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const { jsonBody, ...rest } = handler(url, init);
    return {
      ok: rest.ok ?? false,
      status: rest.status ?? 200,
      json: async () => jsonBody ?? {},
      ...rest,
    } as Response;
  });
}

describe("AuthProvider status", () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("resolves to authenticated when /me returns a user", async () => {
    global.fetch = mockFetch((url) => {
      if (url.includes("/api/auth/me")) {
        return { ok: true, status: 200, jsonBody: { user: { email: "a@b.c" } } };
      }
      return { ok: false, status: 404 };
    }) as typeof fetch;

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe("authenticated:a@b.c"),
    );
  });

  it("resolves to unauthenticated when /me is 401 and refresh also fails (revoked token)", async () => {
    global.fetch = mockFetch((url) => {
      if (url.includes("/api/auth/refresh")) return { ok: false, status: 401 };
      if (url.includes("/api/auth/me")) return { ok: false, status: 401 };
      return { ok: false, status: 404 };
    }) as typeof fetch;

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe("unauthenticated:none"),
    );
  });
});
