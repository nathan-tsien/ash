import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// next-intl's middleware entry eagerly imports `next/server` via a bare specifier
// that vitest can't resolve in this monorepo. We only exercise the auth guard, so
// stub the intl layer with a passthrough; the guard runs before it.
vi.mock("next-intl/middleware", async () => {
  const { NextResponse } = await import("next/server");
  return { default: () => () => NextResponse.next() };
});

const { proxy } = await import("../proxy");

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(`http://localhost${path}`), {
    headers: cookie ? { cookie } : {},
  });
}

function redirectsToLogin(res: Response): boolean {
  const loc = res.headers.get("location");
  return res.status >= 300 && res.status < 400 && !!loc && loc.includes("/login");
}

describe("proxy auth guard", () => {
  it("redirects to /login when there is no session at all", () => {
    expect(redirectsToLogin(proxy(request("/zh/app")))).toBe(true);
  });

  it("does NOT redirect when the access token expired but a refresh token remains", () => {
    // ash_access_token has a 15-min maxAge; the durable session is the 7-day
    // refresh token. A renewable session must reach the app, not /login — this
    // is the case where /me still succeeds via silent refresh.
    const res = proxy(request("/zh/app", "ash_refresh_token=valid-refresh"));
    expect(redirectsToLogin(res)).toBe(false);
  });

  it("allows through when a fresh access token is present", () => {
    const res = proxy(request("/zh/app", "ash_access_token=fresh; ash_refresh_token=r"));
    expect(redirectsToLogin(res)).toBe(false);
  });

  it("never gates public paths", () => {
    expect(redirectsToLogin(proxy(request("/zh/login")))).toBe(false);
  });
});
