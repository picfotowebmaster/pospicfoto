"use client";

import {
  createContext,
  use,
  useEffect,
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  listeners.add(onStoreChange);
  media.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = useCallback(() => {
    const next = getSnapshot() === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return (
    <ThemeContext value={value}>
      {children}
    </ThemeContext>
  );
}
