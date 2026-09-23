import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

const STORAGE_KEY = "hanbeelms.theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage can throw in private-browsing contexts — fall back silently.
  }
  return "system";
}

/**
 * Three-state theme (light/dark/system), matching the shape sketched in
 * docs/HANBEE_LMS_DESIGN_PLAN.md §11. "system" removes the `data-theme`
 * attribute entirely so index.css's `@media (prefers-color-scheme: dark)`
 * block takes over with no JS involved; an explicit choice sets
 * `<html data-theme="light|dark">`, which wins over the media query.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [systemIsDark, setSystemIsDark] = useState(systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = preference;
    }
  }, [preference]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemIsDark(mq.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort persistence only.
    }
  }

  const resolvedTheme: "light" | "dark" = preference === "system" ? (systemIsDark ? "dark" : "light") : preference;

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
