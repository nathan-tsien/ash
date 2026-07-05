import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { LOCALE_COOKIE } from "@/i18n/locale-cookie";

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

/**
 * The non-prefixed auth zone: `(workbench)/(auth)` serves these without a
 * `/[locale]/` segment (locale from the `ash_locale` cookie). They are PUBLIC
 * (a logged-out user must reach `/login`) and must SKIP the next-intl
 * middleware — a locale redirect (`/login` -> `/zh/login`) would 404.
 */
const AUTH_ZONE_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

function isAuthZonePath(pathname: string): boolean {
  return AUTH_ZONE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

const PUBLIC_PATHS = [
  "/",
  "/product",
  "/showcase",
  "/pricing",
  "/docs",
];

function isPublicPath(pathname: string): boolean {
  const pathWithoutLocale = publicPathWithoutLocale(pathname);
  return PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );
}

function publicPathWithoutLocale(pathname: string): string {
  // Strip locale prefix to get the path
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "/";
  }

  if (LOCALES.includes(segments[0] as (typeof LOCALES)[number])) {
    // First segment is a locale prefix — use the rest as the path
    return segments.length > 1 ? `/${segments.slice(1).join("/")}` : "/";
  }

  return `/${segments.join("/")}`;
}

function localePrefix(pathname: string): (typeof LOCALES)[number] | undefined {
  const first = pathname.split("/").filter(Boolean)[0];
  return LOCALES.includes(first as (typeof LOCALES)[number])
    ? (first as (typeof LOCALES)[number])
    : undefined;
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

  // Auth zone (`/login`, `/register`, ...): non-prefixed cookie zone, PUBLIC.
  // Skip the next-intl middleware (no locale redirect) and the session gate so a
  // logged-out user can reach these pages. Locale comes from the `ash_locale`
  // cookie via the i18n request config.
  if (isAuthZonePath(pathname)) {
    return NextResponse.next();
  }

  // App zone (`/app`, `/c`): NO locale redirect. Keep the auth gate, then let
  // the request through — locale comes from the `ash_locale` cookie, resolved
  // inside the i18n request config, not from the path.
  if (isAppZonePath(pathname)) {
    if (!hasSession) {
      // /login lives in the non-prefixed cookie zone; redirect there directly.
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Localized site zone (marketing): gate any protected path, then run the
  // next-intl middleware so `/[locale]/` prefixing + negotiation apply.
  if (!isPublicPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Public marketing pages are path-localized, but the app settings modal and
  // auth/workbench zones store the user's preference in `ash_locale`. Honor it
  // for non-prefixed public URLs so `/pricing` and `/` stay in sync with the
  // workbench language picker.
  if (isPublicPath(pathname) && !localePrefix(pathname)) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    if (LOCALES.includes(cookieLocale as (typeof LOCALES)[number])) {
      const localizedUrl = request.nextUrl.clone();
      const pathWithoutLocale = publicPathWithoutLocale(pathname);
      localizedUrl.pathname =
        pathWithoutLocale === "/"
          ? `/${cookieLocale}`
          : `/${cookieLocale}${pathWithoutLocale}`;
      return NextResponse.redirect(localizedUrl);
    }
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
