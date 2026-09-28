"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "Dark" | "Light" | "System" | "Personalized";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentHue: number;
  setAccentHue: (hue: number) => void;
  accentLightness: number;
  setAccentLightness: (lightness: number) => void;
  activeTheme: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("Dark");
  const [accentHue, setAccentHue] = useState(215);
  const [accentLightness, setAccentLightness] = useState(85);
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Load saved preferences on mount and listen to system theme changes
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("hanbee-theme") as Theme;
    if (savedTheme) setTheme(savedTheme);
    
    const savedHue = localStorage.getItem("hanbee-hue");
    if (savedHue) setAccentHue(Number(savedHue));

    const savedLightness = localStorage.getItem("hanbee-lightness");
    if (savedLightness) setAccentLightness(Number(savedLightness));

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("hanbee-theme", theme);
      localStorage.setItem("hanbee-hue", accentHue.toString());
      localStorage.setItem("hanbee-lightness", accentLightness.toString());
    }
  }, [theme, accentHue, accentLightness, mounted]);

  useEffect(() => {
    // Globally update the custom user hue and lightness in real-time
    document.documentElement.style.setProperty('--user-hue', `${accentHue}`);
    document.documentElement.style.setProperty('--user-lightness', `${accentLightness}%`);
  }, [accentHue, accentLightness]);

  // Determine the actual CSS theme name to apply
  let activeTheme = theme.toLowerCase();
  if (theme === "System") {
    activeTheme = systemPrefersDark ? "dark" : "light";
  }

  // Prevent hydration mismatch by keeping it consistent before mount
  if (!mounted) {
    activeTheme = "dark"; // Default fallback during SSR
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentHue, setAccentHue, accentLightness, setAccentLightness, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
