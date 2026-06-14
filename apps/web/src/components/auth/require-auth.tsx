"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/context/auth-context";

/**
 * Client-side guard for the protected (app) route group.
 *
 * The `proxy.ts` middleware admits any request carrying an `ash_refresh_token`
 * cookie, but it cannot tell whether that token has been revoked/expired without
 * a network call. When the token is present-but-rejected, `/me` + silent refresh
 * fail and the AuthProvider resolves to `unauthenticated`; this guard turns that
 * into a redirect to /login so the user never sits on a broken authenticated
 * shell whose API calls all 401.
 *
 * While the probe is still `loading` we render children (the proxy already
 * guaranteed a session cookie, so the user is almost always valid) to avoid
 * blanking the app on every navigation.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace({ pathname: "/login", query: { callbackUrl: pathname } });
    }
  }, [status, pathname, router]);

  if (status === "unauthenticated") return null;
  return <>{children}</>;
}
