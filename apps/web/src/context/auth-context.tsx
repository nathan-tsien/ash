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

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

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

  useEffect(() => {
    fetchUser()
      .then((u) => setUser(u))
      .catch(() => {});
  }, []);

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
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    fetchUser()
      .then((u) => setUser(u))
      .catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, refreshUser }),
    [user, login, logout, refreshUser],
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
