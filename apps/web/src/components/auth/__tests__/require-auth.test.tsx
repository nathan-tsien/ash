import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Override the global navigation mock (src/__tests__/setup.tsx) with a stable
// `replace` we can assert on, and a protected pathname.
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/app",
}));

let authValue: { status: string; user: unknown };
vi.mock("@/context/auth-context", () => ({
  useAuth: () => authValue,
}));

import { RequireAuth } from "../require-auth";

describe("RequireAuth", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("renders children while the session is still loading (no redirect)", () => {
    authValue = { status: "loading", user: null };
    render(
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );
    expect(screen.queryByText("secret")).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders children when authenticated", () => {
    authValue = { status: "authenticated", user: { id: "1" } };
    render(
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );
    expect(screen.queryByText("secret")).not.toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to /login (with callbackUrl) and hides content when unauthenticated", () => {
    // The revoked/expired-session case: the proxy let the request through on a
    // present refresh token, but /me + silent refresh failed.
    authValue = { status: "unauthenticated", user: null };
    render(
      <RequireAuth>
        <div>secret</div>
      </RequireAuth>,
    );
    expect(screen.queryByText("secret")).toBeNull();
    // /login lives in the non-prefixed cookie zone — no locale segment.
    expect(replace).toHaveBeenCalledWith("/login?callbackUrl=%2Fapp");
  });
});
