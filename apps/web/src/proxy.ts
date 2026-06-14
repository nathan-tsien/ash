import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

const LOCALES = routing.locales;

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/product",
  "/showcase",
  "/pricing",
  "/docs",
];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix to get the path
  const segments = pathname.split("/").filter(Boolean);
  let pathWithoutLocale: string;

  if (segments.length === 0) {
    pathWithoutLocale = "/";
  } else if (LOCALES.includes(segments[0] as (typeof LOCALES)[number])) {
    // First segment is a locale prefix — use the rest as the path
    pathWithoutLocale =
      segments.length > 1 ? `/${segments.slice(1).join("/")}` : "/";
  } else {
    pathWithoutLocale = `/${segments.join("/")}`;
  }

  return PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return intlProxy(request);
  }

  // Check auth for protected routes.
  //
  // Gate on the durable session — the 7-day refresh token — NOT the 15-minute
  // access token. The access token cookie expires every 15 minutes and is meant
  // to be refreshed transparently by the BFF proxy (getAccessTokenWithRefresh);
  // gating on it would bounce a still-valid user to /login the moment it lapses,
  // even though /me + silent refresh succeed. The refresh token is set/cleared
  // atomically with ash_user, so its presence is the renewability signal.
  if (!isPublicPath(pathname)) {
    const hasSession = request.cookies.has("ash_refresh_token");

    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
