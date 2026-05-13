"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "focus-engine-theme";

type ThemeContextValue = {
  /** The raw preference (what the user picked) */
  preference: ThemePreference;
  /** The currently applied theme (system collapsed to light/dark) */
  resolved: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
  /** Cycle light → dark → system */
  cyclePreference: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolvePreference(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

function applyTheme(resolved: ResolvedTheme, animate = false) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 260);
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // We initialise from localStorage on the client. SSR defaults to "system".
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  // Read stored preference + apply resolved theme on mount.
  useEffect(() => {
    let pref: ThemePreference = "system";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        pref = stored;
      }
    } catch {
      /* ignore */
    }
    const r = resolvePreference(pref);
    setPreferenceState(pref);
    setResolved(r);
    applyTheme(r, false);
  }, []);

  // When preference is "system", react to OS theme changes live.
  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolved(r);
      applyTheme(r, true);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    const r = resolvePreference(value);
    setResolved(r);
    applyTheme(r, true);
  }, []);

  const cyclePreference = useCallback(() => {
    setPreference(
      preference === "light"
        ? "dark"
        : preference === "dark"
        ? "system"
        : "light"
    );
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, cyclePreference }),
    [preference, resolved, setPreference, cyclePreference]
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
