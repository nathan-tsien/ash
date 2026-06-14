"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  role: "user" | "admin";
}

/**
 * - `loading`: the initial /me probe has not resolved yet. Guards must NOT
 *   redirect on this — the proxy already gated on a refresh-token cookie, so a
 *   user is almost always present once the probe lands.
 * - `authenticated` / `unauthenticated`: the probe resolved. `unauthenticated`
 *   is what lets a route guard catch the revoked/expired-session case the proxy
 *   cannot detect (a present-but-rejected refresh token).
 */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me");
  if (res.ok) {
    const data = await res.json();
    return data?.user ?? null;
  }
  if (res.status === 401) {
    const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshRes.ok) {
      const retryRes = await fetch("/api/auth/me");
      if (retryRes.ok) {
        const data = await retryRes.json();
        return data?.user ?? null;
      }
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // Resolve the user, collapsing both "resolved null" and "fetch threw" into
  // `unauthenticated`. On a protected route either case means we cannot show an
  // authenticated shell (every API call would 401), so the guard should send the
  // user to /login rather than render a broken page.
  const loadUser = useCallback(() => {
    fetchUser()
      .then((u) => {
        setUser(u);
        setStatus(u ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        setUser(null);
        setStatus("unauthenticated");
      });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? "Login failed");
    }

    const { user: u } = await res.json();
    setUser(u);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, refreshUser: loadUser }),
    [user, status, login, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
