import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

const LOCALES = routing.locales;

/**
 * The non-prefixed app zone: the `(workbench)` root layouts serve these without
 * a `/[locale]/` segment, resolving locale from the `ash_locale` cookie. The
 * next-intl middleware must NOT touch them — it would force a locale redirect
 * (`/app` -> `/zh/app`) that no route matches.
 */
function isAppZonePath(pathname: string): boolean {
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/c" ||
    pathname.startsWith("/c/")
  );
}

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
    return NextResponse.next();
  }

  // The durable-session gate. Gate on the 7-day refresh token — NOT the
  // 15-minute access token. The access token cookie expires every 15 minutes
  // and is meant to be refreshed transparently by the BFF proxy
  // (getAccessTokenWithRefresh); gating on it would bounce a still-valid user to
  // /login the moment it lapses, even though /me + silent refresh succeed. The
  // refresh token is set/cleared atomically with ash_user, so its presence is
  // the renewability signal.
  const hasSession = request.cookies.has("ash_refresh_token");

  // App zone (`/app`, `/c`): NO locale redirect. Keep the auth gate, then let
  // the request through — locale comes from the `ash_locale` cookie, resolved
  // inside the i18n request config, not from the path.
  if (isAppZonePath(pathname)) {
    if (!hasSession) {
      // /login is in the localized (site) zone; send the user to the default
      // locale and let the middleware/site handle further locale negotiation.
      const loginUrl = new URL(`/${routing.defaultLocale}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Localized site zone (marketing + auth): gate protected paths, then run the
  // next-intl middleware so `/[locale]/` prefixing + negotiation apply.
  if (!isPublicPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
