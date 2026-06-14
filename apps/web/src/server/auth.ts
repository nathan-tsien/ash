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

/** Tokens minted by a successful IAM refresh, returned by the single-flight
 *  network call so coalesced callers can each write them to their own response. */
interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Thrown when refresh fails for a non-authoritative reason (5xx, network).
 *  These must NOT end the session — the refresh token is still good; retry later. */
class TransientRefreshError extends Error {}

/** Process-level single-flight, keyed by refresh-token value.
 *
 *  The IAM rotates refresh tokens: each /auth/refresh consumes the presented
 *  token and mints a new one, so a token can only be redeemed once. The workbench
 *  fans out several praxis calls in parallel; when the 15-minute access token
 *  expires, those requests would each redeem the SAME refresh token, letting one
 *  win and the rest fail with "invalid refresh token" — and the old code wiped
 *  the whole session on that failure. Coalescing by token value means concurrent
 *  refreshes share one network call and one rotation, eliminating the stampede.
 *
 *  Keyed by token (not a single global) so distinct users never share a refresh. */
const inFlightRefresh = new Map<string, Promise<RefreshedTokens | null>>();

/** Perform the IAM refresh. Resolves to the new tokens, or null when the token
 *  is definitively invalid (401). Throws TransientRefreshError on 5xx/network so
 *  the caller can tell "session is dead" apart from "try again later". */
async function performRefresh(refreshToken: string): Promise<RefreshedTokens | null> {
  const client = createIamClient();
  let data, error, response;
  try {
    ({ data, error, response } = await client.POST("/auth/refresh", {
      body: { refresh_token: refreshToken },
    }));
  } catch (cause) {
    // fetch rejected (IAM unreachable / DNS / abort) — transient, keep the session.
    throw new TransientRefreshError("iam refresh request failed", { cause });
  }

  if (error || !data) {
    // Only a definitive 401 ("invalid refresh token") means the session is dead.
    // Any other status (5xx, 403-disabled, unexpected) is transient: do not let a
    // momentary IAM hiccup destroy a 7-day session.
    if (response?.status === 401) return null;
    throw new TransientRefreshError(`iam refresh returned ${response?.status ?? "no status"}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: { id: data.user_id, email: data.email, role: data.role },
  };
}

/** Attempt to refresh the access token using the refresh token cookie.
 *  On success, updates all auth cookies and returns the user.
 *  On a definitively-invalid token, clears all auth cookies and returns null.
 *  On a transient failure, leaves cookies intact and returns null (retry later).
 */
export async function refreshAccessToken(): Promise<AuthUser | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  // Single-flight: join an in-flight refresh for this token instead of issuing a
  // second /auth/refresh that would race the rotation and fail.
  let pending = inFlightRefresh.get(refreshToken);
  if (!pending) {
    pending = performRefresh(refreshToken).finally(() => {
      inFlightRefresh.delete(refreshToken);
    });
    inFlightRefresh.set(refreshToken, pending);
  }

  let tokens: RefreshedTokens | null;
  try {
    tokens = await pending;
  } catch {
    // Transient failure — keep the session so a later request can retry.
    return null;
  }

  if (!tokens) {
    // Definitively invalid refresh token: the session is genuinely over.
    await clearAuthCookies();
    return null;
  }

  // Persist the rotated tokens onto this request's response. Coalesced callers
  // all write the same fresh values, so this is idempotent across the race.
  await setAuthCookies({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: tokens.user,
  });

  return tokens.user;
}

/** Return the current access token, refreshing once if the cookie is absent.
 *  Returns undefined if there is no valid session. Use from BFF proxy routes
 *  that forward the iam JWT to downstream services (e.g. praxis).
 */
export async function getAccessTokenWithRefresh(): Promise<string | undefined> {
  const existing = await getAccessToken();
  if (existing) return existing;

  const user = await refreshAccessToken();
  if (!user) return undefined;

  // refreshAccessToken set fresh cookies on the same request's jar; re-read it.
  return getAccessToken();
}
