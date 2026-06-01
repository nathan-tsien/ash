import "server-only";

import { cookies } from "next/headers";
import { createIamClient } from "@ash/iam-client";

const COOKIE_NAMES = {
  accessToken: "ash_access_token",
  refreshToken: "ash_refresh_token",
  user: "ash_user",
} as const;

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  role: "user" | "admin";
}

export async function setAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}) {
  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  jar.set(COOKIE_NAMES.accessToken, params.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 minutes
  });

  jar.set(COOKIE_NAMES.refreshToken, params.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  jar.set(COOKIE_NAMES.user, JSON.stringify(params.user), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(COOKIE_NAMES.accessToken);
  jar.delete(COOKIE_NAMES.refreshToken);
  jar.delete(COOKIE_NAMES.user);
}

export async function getAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE_NAMES.accessToken)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE_NAMES.refreshToken)?.value;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAMES.user)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Attempt to refresh the access token using the refresh token cookie.
 *  On success, updates all auth cookies and returns the user.
 *  On failure, clears all auth cookies and returns null.
 */
export async function refreshAccessToken(): Promise<AuthUser | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const client = createIamClient();
  const { data, error } = await client.POST("/auth/refresh", {
    body: { refresh_token: refreshToken },
  });

  if (error || !data) {
    await clearAuthCookies();
    return null;
  }

  const user: AuthUser = {
    id: data.user_id,
    email: data.email,
    role: data.role,
  };

  await setAuthCookies({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user,
  });

  return user;
}
