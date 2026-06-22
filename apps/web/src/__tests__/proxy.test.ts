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
  it("redirects to a bare /login when there is no session at all", () => {
    // App zone is non-prefixed (/app); the unauthenticated bounce targets the
    // non-prefixed /login (auth now lives in the cookie zone, no locale prefix).
    const res = proxy(request("/app"));
    expect(redirectsToLogin(res)).toBe(true);
    const loc = res.headers.get("location");
    expect(new URL(loc!).pathname).toBe("/login");
    expect(new URL(loc!).searchParams.get("callbackUrl")).toBe("/app");
  });

  it("does NOT redirect when the access token expired but a refresh token remains", () => {
    // ash_access_token has a 15-min maxAge; the durable session is the 7-day
    // refresh token. A renewable session must reach the app, not /login — this
    // is the case where /me still succeeds via silent refresh.
    const res = proxy(request("/app", "ash_refresh_token=valid-refresh"));
    expect(redirectsToLogin(res)).toBe(false);
  });

  it("allows through when a fresh access token is present", () => {
    const res = proxy(request("/app", "ash_access_token=fresh; ash_refresh_token=r"));
    expect(redirectsToLogin(res)).toBe(false);
  });

  it("does NOT locale-redirect the non-prefixed app zone (cookie locale)", () => {
    // The app zone must reach the (workbench) root as-is — no /zh/app rewrite.
    const res = proxy(request("/app", "ash_refresh_token=r"));
    const loc = res.headers.get("location");
    expect(loc).toBeNull();
  });

  it("gates a non-prefixed conversation path the same way", () => {
    expect(redirectsToLogin(proxy(request("/c/conv-1")))).toBe(true);
    expect(
      redirectsToLogin(proxy(request("/c/conv-1", "ash_refresh_token=r"))),
    ).toBe(false);
  });

  it("never gates the localized marketing public paths", () => {
    expect(redirectsToLogin(proxy(request("/zh")))).toBe(false);
    expect(redirectsToLogin(proxy(request("/zh/pricing")))).toBe(false);
  });

  it("treats the bare auth paths as non-prefixed public (no redirect, no intl)", () => {
    // Auth lives in the cookie zone now: /login etc. are public and must NOT be
    // locale-redirected (a /zh/login rewrite would 404 — no such route exists).
    for (const path of [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
    ]) {
      const res = proxy(request(path));
      expect(redirectsToLogin(res)).toBe(false);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("does not gate the auth zone even with a callbackUrl query", () => {
    const res = proxy(request("/login?callbackUrl=%2Fapp"));
    expect(res.headers.get("location")).toBeNull();
  });
});
