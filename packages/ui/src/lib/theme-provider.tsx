"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "ash-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
}

// External store for cross-tab sync and system theme changes
type Listener = () => void;
let storedTheme: Theme = "system";
let resolvedTheme: ResolvedTheme = "light";
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function initTheme() {
  storedTheme = readStoredTheme();
  resolvedTheme = resolveTheme(storedTheme);
  applyTheme(resolvedTheme);
}

function setStoredTheme(theme: Theme) {
  storedTheme = theme;
  resolvedTheme = resolveTheme(theme);
  applyTheme(resolvedTheme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable
  }
  emitChange();
}

function getSnapshot() {
  return storedTheme;
}

function getResolvedSnapshot() {
  return resolvedTheme;
}

function getServerSnapshot(): Theme {
  return "system";
}

function getResolvedServerSnapshot(): ResolvedTheme {
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initialized = useRef(false);

  // Initialize once on mount
  if (!initialized.current && typeof window !== "undefined") {
    initTheme();
    initialized.current = true;
  }

  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const resolved = useSyncExternalStore(
    subscribe,
    getResolvedSnapshot,
    getResolvedServerSnapshot,
  );

  const setTheme = useCallback((t: Theme) => {
    setStoredTheme(t);
  }, []);

  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (storedTheme === "system") {
        resolvedTheme = resolveTheme("system");
        applyTheme(resolvedTheme);
        emitChange();
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Listen for cross-tab localStorage changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const newTheme = readStoredTheme();
        storedTheme = newTheme;
        resolvedTheme = resolveTheme(newTheme);
        applyTheme(resolvedTheme);
        emitChange();
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
