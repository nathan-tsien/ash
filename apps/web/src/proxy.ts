import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

const PUBLIC_PATHS = [
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
  const pathWithoutLocale =
    segments.length > 1 ? `/${segments.slice(1).join("/")}` : `/${segments[0] ?? ""}`;

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

  // Check auth for protected routes
  if (!isPublicPath(pathname)) {
    const accessToken = request.cookies.get("ash_access_token")?.value;
    const user = request.cookies.get("ash_user")?.value;

    if (!accessToken || !user) {
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
